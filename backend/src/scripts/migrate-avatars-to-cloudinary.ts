import path from 'path';
import fs from 'fs';
import { connectDB, closeDB } from '../config/db.js';
import { User } from '../models/User.js';
import { CloudinaryService } from '../services/cloudinary.service.js';
import { isCloudinaryConfigured } from '../config/cloudinary.js';

export const runAvatarMigration = async (options: { closeOnFinish?: boolean } = {}) => {
  console.log('\n======================================================');
  console.log('   AdvD CLOUDINARY AVATAR MIGRATION PROCEDURE');
  console.log('======================================================\n');

  if (!isCloudinaryConfigured()) {
    console.warn(
      '[WARN] Cloudinary environment credentials are not fully configured.'
    );
    console.warn(
      '       Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.\n'
    );
  }

  await connectDB();

  let totalUsers = 0;
  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const users = await User.find({
      avatar: { $exists: true, $ne: '' },
    });

    totalUsers = users.length;
    console.log(`Found ${totalUsers} user(s) with an existing profile avatar.\n`);

    for (const user of users) {
      const currentAvatar = user.avatar?.trim() || '';

      // 1. Skip if already migrated to Cloudinary
      if (
        user.avatarPublicId ||
        user.profilePicturePublicId ||
        currentAvatar.includes('res.cloudinary.com')
      ) {
        console.log(`- User [${user.email}]: Already migrated to Cloudinary. Skipping.`);
        skipped++;
        continue;
      }

      console.log(`- Migrating User [${user.email}]...`);

      try {
        // Case A: Avatar is stored as a Base64 Data URI
        if (currentAvatar.startsWith('data:image/')) {
          const result = await CloudinaryService.uploadBase64(
            currentAvatar,
            user._id.toString()
          );

          user.avatar = result.secureUrl;
          user.avatarPublicId = result.publicId;
          user.profilePicture = result.secureUrl;
          user.profilePicturePublicId = result.publicId;
          await user.save();

          console.log(`  -> SUCCESS: Base64 avatar migrated to Cloudinary (${result.publicId})`);
          migrated++;
        }
        // Case B: Avatar is stored as a local filesystem path
        else if (currentAvatar.startsWith('/') || currentAvatar.includes('uploads')) {
          const resolvedPath = path.isAbsolute(currentAvatar)
            ? currentAvatar
            : path.resolve(process.cwd(), currentAvatar.replace(/^\//, ''));

          if (fs.existsSync(resolvedPath)) {
            const buffer = fs.readFileSync(resolvedPath);
            const ext = path.extname(resolvedPath).toLowerCase();
            const mimetype = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

            const result = await CloudinaryService.uploadProfilePicture(
              buffer,
              user._id.toString(),
              mimetype
            );

            user.avatar = result.secureUrl;
            user.avatarPublicId = result.publicId;
            user.profilePicture = result.secureUrl;
            user.profilePicturePublicId = result.publicId;
            await user.save();

            console.log(`  -> SUCCESS: Local file [${resolvedPath}] migrated to Cloudinary (${result.publicId})`);
            migrated++;
          } else {
            console.warn(
              `  -> LIMITATION: Local image file not found at [${resolvedPath}]. Preserving original reference.`
            );
            failed++;
          }
        } else {
          console.warn(`  -> SKIPPED: Unknown avatar format [${currentAvatar.slice(0, 30)}...]`);
          skipped++;
        }
      } catch (userErr: any) {
        console.error(`  -> FAILED migrating user [${user.email}]:`, userErr.message);
        failed++;
      }
    }

    console.log('\n======================================================');
    console.log(`   MIGRATION COMPLETED:`);
    console.log(`   - Total Processed : ${totalUsers}`);
    console.log(`   - Migrated        : ${migrated}`);
    console.log(`   - Skipped         : ${skipped}`);
    console.log(`   - Failed / Missing: ${failed}`);
    console.log('======================================================\n');
  } catch (err: any) {
    console.error('Migration encountered fatal error:', err);
  } finally {
    if (options.closeOnFinish) {
      await closeDB();
    }
  }
};

// Execute if run directly
if (process.argv[1] && process.argv[1].includes('migrate-avatars-to-cloudinary')) {
  runAvatarMigration({ closeOnFinish: true });
}

