import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../app.js';
import { connectDB, closeDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Workspace } from '../models/Workspace.js';
import { WorkspaceMembership } from '../models/WorkspaceMembership.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { runAvatarMigration } from '../scripts/migrate-avatars-to-cloudinary.js';

const runTests = async () => {
  console.log('\n======================================================');
  console.log('   AdvD CLOUDINARY AVATAR & PROFILE PICTURE TEST SUITE');
  console.log('======================================================\n');

  await connectDB();
  const app = createApp();

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string, detail?: string) => {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  };

  try {
    // 0. Clean test records
    await User.deleteMany({ email: /@cloudinary-test\.com$/ });
    await RefreshToken.deleteMany({});
    const testWorkspaces = await Workspace.find({ name: /Cloudinary Chamber/ });
    const wsIds = testWorkspaces.map((w) => w._id);
    await Workspace.deleteMany({ _id: { $in: wsIds } });
    await WorkspaceMembership.deleteMany({ workspaceId: { $in: wsIds } });

    console.log('1. Setting up Test Advocate A & Advocate B');

    // Register Advocate A
    const advARes = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Adv. Sameer Joshi',
        email: 'sameer@cloudinary-test.com',
        mobile: '+919833011223',
        password: 'Password@123',
        barCouncilNumber: 'MAH/3322/2015',
        stateBarCouncil: 'Bar Council of Maharashtra & Goa',
        officeName: 'Cloudinary Chamber A - Joshi & Co',
      });

    assert(advARes.status === 201, 'Advocate A registered with HTTP 201');
    const tokenA = advARes.body.data.tokens.accessToken;
    const userAId = advARes.body.data.user.id;

    // Register Advocate B
    const advBRes = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Adv. Pooja Patil',
        email: 'pooja@cloudinary-test.com',
        mobile: '+919833099887',
        password: 'Password@123',
        barCouncilNumber: 'MAH/4411/2018',
        stateBarCouncil: 'Bar Council of Maharashtra & Goa',
        officeName: 'Cloudinary Chamber B - Patil Chambers',
      });

    assert(advBRes.status === 201, 'Advocate B registered with HTTP 201');
    const tokenB = advBRes.body.data.tokens.accessToken;
    const userBId = advBRes.body.data.user.id;

    console.log('\n2. Testing Multipart Memory Upload to Cloudinary');

    // 1x1 valid PNG buffer
    const dummyPngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const uploadRes = await request(app)
      .post('/api/settings/profile/avatar')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('avatar', dummyPngBuffer, { filename: 'advocate-headshot.png', contentType: 'image/png' });

    assert(uploadRes.status === 200, 'POST /api/settings/profile/avatar returned HTTP 200');
    assert(uploadRes.body.success === true, 'Upload response indicates success');
    assert(
      uploadRes.body.data.avatar.includes('res.cloudinary.com') || uploadRes.body.data.avatar.startsWith('https://'),
      'Secure Cloudinary image URL returned'
    );
    assert(
      !!uploadRes.body.data.publicId && uploadRes.body.data.publicId.includes('advd/profile-pictures/'),
      'Cloudinary public ID stored in advd/profile-pictures folder'
    );

    const initialPublicId = uploadRes.body.data.publicId;

    // Verify MongoDB User record
    const userA = await User.findById(userAId);
    assert(userA?.avatar === uploadRes.body.data.avatar, 'User.avatar in MongoDB matches Cloudinary secure URL');
    assert(userA?.avatarPublicId === initialPublicId, 'User.avatarPublicId persisted in MongoDB');
    assert(userA?.profilePicture === userA?.avatar, 'User.profilePicture synchronized with avatar');
    assert(!userA?.avatar?.startsWith('data:image/'), 'Image binary/base64 data is NOT stored in MongoDB');

    console.log('\n3. Testing GET Profile & Auth Me Return Cloudinary URL');

    const getProfileRes = await request(app)
      .get('/api/settings/profile')
      .set('Authorization', `Bearer ${tokenA}`);

    assert(getProfileRes.status === 200, 'GET /api/settings/profile returned HTTP 200');
    assert(getProfileRes.body.data.avatar === userA?.avatar, 'Profile payload contains Cloudinary avatar URL');
    assert(getProfileRes.body.data.profilePicture === userA?.avatar, 'Profile payload contains profilePicture URL');

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenA}`);

    assert(meRes.status === 200, 'GET /api/auth/me returned HTTP 200');
    assert(meRes.body.data.user.avatar === userA?.avatar, 'Auth /me payload contains Cloudinary avatar URL');
    assert(meRes.body.data.user.profilePicture === userA?.avatar, 'Auth /me payload contains profilePicture URL');

    console.log('\n4. Testing Profile Picture Replacement & Previous Cleanup');

    // Upload a new WebP image
    const secondUploadRes = await request(app)
      .post('/api/settings/profile/avatar')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('avatar', dummyPngBuffer, { filename: 'updated-photo.webp', contentType: 'image/webp' });

    assert(secondUploadRes.status === 200, 'Second avatar upload succeeded with HTTP 200');
    const newPublicId = secondUploadRes.body.data.publicId;
    assert(newPublicId !== initialPublicId, 'New Cloudinary public ID generated');

    const updatedUserA = await User.findById(userAId);
    assert(updatedUserA?.avatarPublicId === newPublicId, 'User.avatarPublicId updated to new public ID');

    console.log('\n5. Testing Profile Picture Deletion from Cloudinary');

    const deleteRes = await request(app)
      .delete('/api/settings/profile/avatar')
      .set('Authorization', `Bearer ${tokenA}`);

    assert(deleteRes.status === 200, 'DELETE /api/settings/profile/avatar returned HTTP 200');
    assert(deleteRes.body.data.avatar === '', 'Avatar cleared in response');

    const clearedUserA = await User.findById(userAId);
    assert(clearedUserA?.avatar === '', 'User.avatar cleared in MongoDB');
    assert(clearedUserA?.avatarPublicId === '', 'User.avatarPublicId cleared in MongoDB');
    assert(clearedUserA?.profilePicture === '', 'User.profilePicture cleared in MongoDB');

    console.log('\n6. Testing Input Validations & Security Restrictions');

    // A. Reject unsupported file format (e.g., .pdf)
    const rejectPdfRes = await request(app)
      .post('/api/settings/profile/avatar')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('avatar', Buffer.from('%PDF-1.4 Fake PDF'), { filename: 'document.pdf', contentType: 'application/pdf' });

    assert(rejectPdfRes.status === 400, 'Unsupported file type (.pdf) rejected with HTTP 400');

    // B. Reject oversized image (> 5MB)
    const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 0);
    const rejectLargeRes = await request(app)
      .post('/api/settings/profile/avatar')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('avatar', largeBuffer, { filename: 'huge-image.png', contentType: 'image/png' });

    assert(rejectLargeRes.status >= 400, 'Image > 5MB rejected with HTTP 400/413');

    // C. Unauthenticated upload rejected
    const unauthRes = await request(app)
      .post('/api/settings/profile/avatar')
      .attach('avatar', dummyPngBuffer, { filename: 'photo.jpg', contentType: 'image/jpeg' });

    assert(unauthRes.status === 401, 'Unauthenticated upload rejected with HTTP 401');

    console.log('\n7. Testing Isolation: User B Cannot Delete or Alter User A Avatar');

    // User A uploads avatar
    await request(app)
      .post('/api/settings/profile/avatar')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('avatar', dummyPngBuffer, { filename: 'userA.png', contentType: 'image/png' });

    // User B deletes own avatar
    await request(app)
      .delete('/api/settings/profile/avatar')
      .set('Authorization', `Bearer ${tokenB}`);

    const verifyUserA = await User.findById(userAId);
    assert(verifyUserA?.avatar !== '', 'User B deleting avatar does NOT affect User A avatar');

    console.log('\n8. Testing Legacy Profile Picture Migration Procedure');

    // Set User B with a legacy Base64 avatar
    const legacyBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    await User.findByIdAndUpdate(userBId, {
      avatar: legacyBase64,
      avatarPublicId: '',
      profilePicture: '',
    });

    // Run the migration procedure
    await runAvatarMigration();

    const migratedUserB = await User.findById(userBId);
    assert(
      Boolean(migratedUserB?.avatar?.startsWith('https://') || migratedUserB?.avatar?.includes('res.cloudinary.com')),
      'Legacy Base64 avatar successfully migrated to Cloudinary secure URL'
    );
    assert(
      !!migratedUserB?.avatarPublicId && migratedUserB.avatarPublicId.includes('advd/profile-pictures/'),
      'Migration populated Cloudinary public ID'
    );

    // Re-run migration: verify it is idempotent
    await runAvatarMigration();
    const secondCheckUserB = await User.findById(userBId);
    assert(secondCheckUserB?.avatarPublicId === migratedUserB?.avatarPublicId, 'Migration is idempotent (skipped already migrated)');

    console.log('\n------------------------------------------------------');
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('------------------------------------------------------\n');

    if (failed > 0) {
      process.exit(1);
    }
    process.exit(0);
  } catch (err: any) {
    console.error('Test suite failed with unexpected error:', err);
    process.exit(1);
  } finally {
    await closeDB();
  }
};

runTests();

