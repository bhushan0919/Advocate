import { Request, Response, NextFunction } from 'express';
import mongoose, { Types } from 'mongoose';
import { z } from 'zod';
import { DocumentModel, DocumentCategory } from '../models/Document.js';
import { Case } from '../models/Case.js';
import { Client } from '../models/Client.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { storageService } from '../services/storage.service.js';

export const updateDocumentSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, 'Title is required').max(200).optional(),
    description: z.string().trim().max(1000).optional(),
    category: z.string().optional(),
    caseId: z.string().optional().nullable(),
    clientId: z.string().optional().nullable(),
  }),
});

export const documentController = {
  // --------------------------------------------------------------------------
  // 1. List Documents with Search, Filters & Pagination
  // --------------------------------------------------------------------------
  getDocuments: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const {
        search,
        category,
        fileType,
        caseId,
        clientId,
        startDate,
        endDate,
        page = '1',
        limit = '20',
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const query: any = {
        workspaceId,
        isArchived: { $ne: true },
      };

      // Case filter
      if (caseId && Types.ObjectId.isValid(caseId as string)) {
        query.caseId = new Types.ObjectId(caseId as string);
      }

      // Client filter
      if (clientId && Types.ObjectId.isValid(clientId as string)) {
        query.clientId = new Types.ObjectId(clientId as string);
      }

      // Category filter
      if (category && category !== 'All' && category !== 'all') {
        query.category = category;
      }

      // File type filter (pdf, image, doc, excel)
      if (fileType && fileType !== 'All' && fileType !== 'all') {
        const typeStr = (fileType as string).toLowerCase();
        if (typeStr === 'pdf') {
          query.mimeType = 'application/pdf';
        } else if (typeStr === 'image') {
          query.mimeType = { $in: ['image/jpeg', 'image/png'] };
        } else if (typeStr === 'doc' || typeStr === 'word') {
          query.mimeType = {
            $in: [
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ],
          };
        } else if (typeStr === 'excel' || typeStr === 'sheet') {
          query.mimeType = {
            $in: [
              'application/vnd.ms-excel',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ],
          };
        }
      }

      // Date range filter
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = new Date(startDate as string);
        }
        if (endDate) {
          const end = new Date(endDate as string);
          end.setHours(23, 59, 59, 999);
          query.createdAt.$lte = end;
        }
      }

      // Search by title or related case/client
      if (search && typeof search === 'string' && search.trim()) {
        const searchRegex = new RegExp(search.trim(), 'i');

        // Look for matching cases or clients first
        const [matchingCases, matchingClients] = await Promise.all([
          Case.find({ workspaceId, caseNumber: searchRegex }).select('_id'),
          Client.find({ workspaceId, fullName: searchRegex }).select('_id'),
        ]);

        const orConditions: any[] = [
          { title: searchRegex },
          { originalFileName: searchRegex },
          { description: searchRegex },
        ];

        if (matchingCases.length > 0) {
          orConditions.push({ caseId: { $in: matchingCases.map((c) => c._id) } });
        }
        if (matchingClients.length > 0) {
          orConditions.push({ clientId: { $in: matchingClients.map((c) => c._id) } });
        }

        query.$or = orConditions;
      }

      const sortOptions: any = {};
      sortOptions[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

      const [documents, total] = await Promise.all([
        DocumentModel.find(query)
          .populate('caseId', 'caseNumber courtName clientName caseType status')
          .populate('clientId', 'fullName mobile email')
          .populate('uploadedBy', 'fullName email designation avatar')
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        DocumentModel.countDocuments(query),
      ]);

      res.status(200).json({
        success: true,
        data: {
          documents,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // --------------------------------------------------------------------------
  // 2. Get Single Document Details
  // --------------------------------------------------------------------------
  getDocumentById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId!;

      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid document ID format.' });
        return;
      }

      const document = await DocumentModel.findOne({
        _id: id,
        workspaceId,
        isArchived: { $ne: true },
      })
        .populate('caseId', 'caseNumber courtName courtRoomNumber clientName opponentName caseType status')
        .populate('clientId', 'fullName mobile email address')
        .populate('uploadedBy', 'fullName email designation');

      if (!document) {
        res.status(404).json({ success: false, message: 'Document not found in this chamber.' });
        return;
      }

      res.status(200).json({
        success: true,
        data: document,
      });
    } catch (error) {
      next(error);
    }
  },

  // --------------------------------------------------------------------------
  // 3. Upload Document (Multipart Form Data)
  // --------------------------------------------------------------------------
  createDocument: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const file = req.file;

      if (!file) {
        res.status(400).json({ success: false, message: 'A legal document file is required.' });
        return;
      }

      const { title, description, category, caseId, clientId } = req.body;

      if (!title || typeof title !== 'string' || !title.trim()) {
        res.status(400).json({ success: false, message: 'Document title is required.' });
        return;
      }

      // Verify case reference if provided
      let validCaseId: Types.ObjectId | undefined;
      if (caseId && typeof caseId === 'string' && caseId.trim()) {
        if (!Types.ObjectId.isValid(caseId)) {
          res.status(400).json({ success: false, message: 'Invalid case ID format.' });
          return;
        }
        const existingCase = await Case.findOne({ _id: caseId, workspaceId });
        if (!existingCase) {
          res.status(404).json({ success: false, message: 'Referenced case not found in this chamber.' });
          return;
        }
        validCaseId = existingCase._id;
      }

      // Verify client reference if provided
      let validClientId: Types.ObjectId | undefined;
      if (clientId && typeof clientId === 'string' && clientId.trim()) {
        if (!Types.ObjectId.isValid(clientId)) {
          res.status(400).json({ success: false, message: 'Invalid client ID format.' });
          return;
        }
        const existingClient = await Client.findOne({ _id: clientId, workspaceId });
        if (!existingClient) {
          res.status(404).json({ success: false, message: 'Referenced client not found in this chamber.' });
          return;
        }
        validClientId = existingClient._id;
      }

      // Save file to partitioned storage
      const savedInfo = await storageService.saveFile(workspaceId.toString(), file);

      // Create Document document
      const doc = await DocumentModel.create({
        workspaceId,
        caseId: validCaseId,
        clientId: validClientId,
        title: title.trim(),
        description: description ? description.trim() : '',
        category: (category as DocumentCategory) || 'Case Documents',
        storageKey: savedInfo.storageKey,
        storedFileName: savedInfo.storedFileName,
        originalFileName: savedInfo.originalFileName,
        mimeType: savedInfo.mimeType,
        fileSize: savedInfo.fileSize,
        storageProvider: savedInfo.storageProvider,
        uploadedBy: req.user!._id,
      });

      // Populate for response
      const populated = await DocumentModel.findById(doc._id)
        .populate('caseId', 'caseNumber courtName clientName')
        .populate('clientId', 'fullName mobile')
        .populate('uploadedBy', 'fullName email designation');

      // Audit log
      await ActivityLog.create({
        workspaceId,
        userId: req.user!._id,
        action: 'DOCUMENT_UPLOADED',
        resourceType: 'Document',
        resourceId: doc._id,
        details: {
          title: doc.title,
          category: doc.category,
          originalFileName: doc.originalFileName,
          fileSize: doc.fileSize,
          caseId: doc.caseId,
        },
        ipAddress: req.ip,
      });

      res.status(201).json({
        success: true,
        message: 'Legal document uploaded and indexed successfully.',
        data: populated,
      });
    } catch (error) {
      next(error);
    }
  },

  // --------------------------------------------------------------------------
  // 4. Update Document Metadata
  // --------------------------------------------------------------------------
  updateDocument: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId!;

      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid document ID format.' });
        return;
      }

      const document = await DocumentModel.findOne({
        _id: id,
        workspaceId,
        isArchived: { $ne: true },
      });

      if (!document) {
        res.status(404).json({ success: false, message: 'Document not found in this chamber.' });
        return;
      }

      const { title, description, category, caseId, clientId } = req.body;

      if (title !== undefined) {
        if (!title.trim()) {
          res.status(400).json({ success: false, message: 'Document title cannot be empty.' });
          return;
        }
        document.title = title.trim();
      }

      if (description !== undefined) {
        document.description = description.trim();
      }

      if (category !== undefined) {
        document.category = category as DocumentCategory;
      }

      if (caseId !== undefined) {
        if (caseId === null || caseId === '') {
          document.caseId = undefined;
        } else {
          if (!Types.ObjectId.isValid(caseId)) {
            res.status(400).json({ success: false, message: 'Invalid case ID format.' });
            return;
          }
          const validCase = await Case.findOne({ _id: caseId, workspaceId });
          if (!validCase) {
            res.status(404).json({ success: false, message: 'Referenced case not found in this chamber.' });
            return;
          }
          document.caseId = validCase._id;
        }
      }

      if (clientId !== undefined) {
        if (clientId === null || clientId === '') {
          document.clientId = undefined;
        } else {
          if (!Types.ObjectId.isValid(clientId)) {
            res.status(400).json({ success: false, message: 'Invalid client ID format.' });
            return;
          }
          const validClient = await Client.findOne({ _id: clientId, workspaceId });
          if (!validClient) {
            res.status(404).json({ success: false, message: 'Referenced client not found in this chamber.' });
            return;
          }
          document.clientId = validClient._id;
        }
      }

      await document.save();

      const populated = await DocumentModel.findById(document._id)
        .populate('caseId', 'caseNumber courtName clientName')
        .populate('clientId', 'fullName mobile')
        .populate('uploadedBy', 'fullName email designation');

      // Audit log
      await ActivityLog.create({
        workspaceId,
        userId: req.user!._id,
        action: 'DOCUMENT_METADATA_UPDATED',
        resourceType: 'Document',
        resourceId: document._id,
        details: { title: document.title, category: document.category },
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'Document metadata updated successfully.',
        data: populated,
      });
    } catch (error) {
      next(error);
    }
  },

  // --------------------------------------------------------------------------
  // 5. Delete Document (Advocate/Owner Only)
  // --------------------------------------------------------------------------
  deleteDocument: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId!;

      // Permission check: Clerks cannot delete documents!
      if (req.workspaceMembership?.role !== 'owner' && req.workspaceMembership?.role !== 'advocate') {
        res.status(403).json({
          success: false,
          message: 'Permission denied: Only advocates and chamber owners can delete case documents.',
        });
        return;
      }

      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid document ID format.' });
        return;
      }

      const document = await DocumentModel.findOne({ _id: id, workspaceId });
      if (!document) {
        res.status(404).json({ success: false, message: 'Document not found in this chamber.' });
        return;
      }

      // Soft delete from DB
      document.isArchived = true;
      await document.save();

      // Delete file from storage
      await storageService.deleteFile(document.storageKey, workspaceId.toString());

      // Audit log
      await ActivityLog.create({
        workspaceId,
        userId: req.user!._id,
        action: 'DOCUMENT_DELETED',
        resourceType: 'Document',
        resourceId: document._id,
        details: { title: document.title, originalFileName: document.originalFileName },
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'Document has been removed securely from chamber records.',
      });
    } catch (error) {
      next(error);
    }
  },

  // --------------------------------------------------------------------------
  // 6. Download Document (Authenticated Stream)
  // --------------------------------------------------------------------------
  downloadDocument: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId!;

      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid document ID format.' });
        return;
      }

      const document = await DocumentModel.findOne({
        _id: id,
        workspaceId,
        isArchived: { $ne: true },
      });

      if (!document) {
        res.status(404).json({ success: false, message: 'Document not found in this chamber.' });
        return;
      }

      const exists = storageService.fileExists(document.storageKey, workspaceId.toString());
      if (!exists) {
        res.status(404).json({ success: false, message: 'Document file not found on chamber disk.' });
        return;
      }

      // Set headers for download
      res.setHeader('Content-Type', document.mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(document.originalFileName)}"`
      );
      res.setHeader('Content-Length', document.fileSize);

      const stream = storageService.getFileStream(document.storageKey, workspaceId.toString());
      stream.pipe(res);

      // Log download activity asynchronously
      ActivityLog.create({
        workspaceId,
        userId: req.user!._id,
        action: 'DOCUMENT_DOWNLOADED',
        resourceType: 'Document',
        resourceId: document._id,
        details: { title: document.title, originalFileName: document.originalFileName },
        ipAddress: req.ip,
      }).catch((e) => console.error('Failed to log document download:', e));
    } catch (error) {
      next(error);
    }
  },

  // --------------------------------------------------------------------------
  // 7. Preview Document (Inline Stream for PDF & Images)
  // --------------------------------------------------------------------------
  previewDocument: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId!;

      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid document ID format.' });
        return;
      }

      const document = await DocumentModel.findOne({
        _id: id,
        workspaceId,
        isArchived: { $ne: true },
      });

      if (!document) {
        res.status(404).json({ success: false, message: 'Document not found in this chamber.' });
        return;
      }

      const exists = storageService.fileExists(document.storageKey, workspaceId.toString());
      if (!exists) {
        res.status(404).json({ success: false, message: 'Document file not found on chamber disk.' });
        return;
      }

      // Set headers for inline preview
      res.setHeader('Content-Type', document.mimeType);
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(document.originalFileName)}"`
      );
      res.setHeader('Content-Length', document.fileSize);

      const stream = storageService.getFileStream(document.storageKey, workspaceId.toString());
      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  },

  // --------------------------------------------------------------------------
  // 8. Case Documents Specific Endpoints
  // --------------------------------------------------------------------------
  getCaseDocuments: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { caseId } = req.params;
      const workspaceId = req.workspaceId!;

      if (!Types.ObjectId.isValid(caseId)) {
        res.status(400).json({ success: false, message: 'Invalid case ID format.' });
        return;
      }

      const existingCase = await Case.findOne({ _id: caseId, workspaceId });
      if (!existingCase) {
        res.status(404).json({ success: false, message: 'Case not found in this chamber.' });
        return;
      }

      const documents = await DocumentModel.find({
        workspaceId,
        caseId,
        isArchived: { $ne: true },
      })
        .populate('uploadedBy', 'fullName email designation avatar')
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        data: documents,
      });
    } catch (error) {
      next(error);
    }
  },
};

