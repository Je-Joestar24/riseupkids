jest.mock('../models', () => ({
  User: {
    findById: jest.fn(),
    findOne: jest.fn(),
  },
  ChildProfile: {
    findOne: jest.fn(),
    findById: jest.fn(),
    updateMany: jest.fn(),
    deleteOne: jest.fn(),
    find: jest.fn(),
  },
  ChildStats: { deleteMany: jest.fn() },
  Progress: { deleteMany: jest.fn() },
  BookReading: { deleteMany: jest.fn() },
  AudioAssignmentProgress: { find: jest.fn(), deleteMany: jest.fn() },
  ChantProgress: { find: jest.fn(), deleteMany: jest.fn() },
  StarEarning: { deleteMany: jest.fn() },
  CourseProgress: { deleteMany: jest.fn() },
  VideoWatch: { deleteMany: jest.fn() },
  KidsWallPost: { find: jest.fn(), deleteMany: jest.fn() },
  StarCamEvent: { deleteMany: jest.fn() },
  ContactSupport: { deleteMany: jest.fn() },
  PasswordResetToken: { deleteMany: jest.fn() },
  Media: { find: jest.fn(), deleteMany: jest.fn() },
  GoogleIntegration: { deleteMany: jest.fn() },
}));

jest.mock('../models/AccountDeletionRequest', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateMany: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
}));

jest.mock('../services/s3.service', () => ({
  deleteByKey: jest.fn(),
  getS3KeyFromUrl: jest.fn(),
}));

jest.mock('../services/mail', () => ({
  sendDeletionRequested: jest.fn(),
  sendDeletionCompleted: jest.fn(),
}));

jest.mock('../services/stripe.services', () => ({
  cancelSubscription: jest.fn(),
}));

const {
  User,
  ChildProfile,
  AudioAssignmentProgress,
  ChantProgress,
  KidsWallPost,
  Media,
  ChildStats,
  Progress,
  BookReading,
  StarEarning,
  CourseProgress,
  VideoWatch,
  StarCamEvent,
  ContactSupport,
  PasswordResetToken,
  GoogleIntegration,
} = require('../models');
const AccountDeletionRequest = require('../models/AccountDeletionRequest');
const s3Service = require('../services/s3.service');
const mailService = require('../services/mail');
const { cancelSubscription } = require('../services/stripe.services');
const accountDeletionService = require('../services/accountDeletion.service');

const PARENT_ID = '507f1f77bcf86cd799439011';
const CHILD_ID = '507f1f77bcf86cd799439012';
const REQUEST_ID = '507f1f77bcf86cd799439013';

function mockPasswordUser(overrides = {}) {
  return {
    _id: PARENT_ID,
    email: 'parent@example.com',
    role: 'parent',
    isActive: true,
    subscriptionStatus: 'active',
    paymentProvider: null,
    stripeSubscriptionId: null,
    planKidsLimit: 2,
    matchPassword: jest.fn().mockResolvedValue(true),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function chainLean(value) {
  return { select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(value) };
}

function emptyMediaFind() {
  AudioAssignmentProgress.find.mockReturnValue(chainLean([]));
  ChantProgress.find.mockReturnValue(chainLean([]));
  KidsWallPost.find.mockReturnValue(chainLean([]));
  Media.find.mockReturnValue(chainLean([]));
}

describe('accountDeletion.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    s3Service.deleteByKey.mockResolvedValue(undefined);
    s3Service.getS3KeyFromUrl.mockReturnValue('kids-wall/photo.jpg');
    mailService.sendDeletionRequested.mockResolvedValue({});
    mailService.sendDeletionCompleted.mockResolvedValue({});
    emptyMediaFind();
    [
      ChildStats,
      Progress,
      BookReading,
      AudioAssignmentProgress,
      ChantProgress,
      StarEarning,
      CourseProgress,
      VideoWatch,
      KidsWallPost,
      StarCamEvent,
      Media,
    ].forEach((model) => {
      if (model.deleteMany) model.deleteMany.mockResolvedValue({ deletedCount: 1 });
    });
    ContactSupport.deleteMany.mockResolvedValue({});
    PasswordResetToken.deleteMany.mockResolvedValue({});
    StarCamEvent.deleteMany.mockResolvedValue({});
    GoogleIntegration.deleteMany.mockResolvedValue({});
    AccountDeletionRequest.updateMany.mockResolvedValue({ modifiedCount: 0 });
    ChildProfile.deleteOne.mockResolvedValue({});
    ChildProfile.updateMany.mockResolvedValue({});
    ChildProfile.find.mockReturnValue({ distinct: jest.fn().mockResolvedValue([CHILD_ID]) });
    AccountDeletionRequest.findOne.mockResolvedValue(null);
  });

  describe('requestChildProfileDeletion', () => {
    it('revokes child access, creates request, and sends email', async () => {
      const user = mockPasswordUser();
      User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

      const child = {
        _id: CHILD_ID,
        displayName: 'Alex',
        isActive: true,
        save: jest.fn().mockResolvedValue(undefined),
      };
      ChildProfile.findOne.mockResolvedValue(child);
      User.findById.mockReturnValueOnce({ select: jest.fn().mockResolvedValue(user) });
      User.findById.mockReturnValueOnce(chainLean({ email: 'parent@example.com', name: 'Parent' }));

      AccountDeletionRequest.create.mockResolvedValue({
        _id: REQUEST_ID,
        type: 'child_profile',
      });

      const result = await accountDeletionService.requestChildProfileDeletion(
        PARENT_ID,
        CHILD_ID,
        { password: 'secret123', confirmText: 'DELETE', requesterIp: '127.0.0.1' }
      );

      expect(child.isActive).toBe(false);
      expect(child.save).toHaveBeenCalled();
      expect(AccountDeletionRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'child_profile',
          userId: PARENT_ID,
          childId: CHILD_ID,
          status: 'pending',
        })
      );
      expect(mailService.sendDeletionRequested).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'parent@example.com',
          type: 'child_profile',
          childDisplayName: 'Alex',
        })
      );
      expect(result.accessRevoked).toBe(true);
      expect(result.displayName).toBe('Alex');
    });

    it('rejects invalid confirm text', async () => {
      await expect(
        accountDeletionService.requestChildProfileDeletion(PARENT_ID, CHILD_ID, {
          password: 'secret123',
          confirmText: 'REMOVE',
        })
      ).rejects.toThrow('Please type DELETE to confirm deletion');
    });

    it('rejects incorrect password', async () => {
      const user = mockPasswordUser({ matchPassword: jest.fn().mockResolvedValue(false) });
      User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

      await expect(
        accountDeletionService.requestChildProfileDeletion(PARENT_ID, CHILD_ID, {
          password: 'wrong',
          confirmText: 'DELETE',
        })
      ).rejects.toThrow('Password is incorrect');
    });

    it('rejects when child does not belong to parent', async () => {
      const user = mockPasswordUser();
      User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
      ChildProfile.findOne.mockResolvedValue(null);

      await expect(
        accountDeletionService.requestChildProfileDeletion(PARENT_ID, CHILD_ID, {
          password: 'secret123',
          confirmText: 'DELETE',
        })
      ).rejects.toThrow('Child profile not found or does not belong to you');
    });

    it('rejects duplicate pending child deletion request', async () => {
      const user = mockPasswordUser();
      User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
      ChildProfile.findOne.mockResolvedValue({
        _id: CHILD_ID,
        displayName: 'Alex',
        save: jest.fn(),
      });
      AccountDeletionRequest.findOne.mockResolvedValue({ _id: REQUEST_ID, status: 'pending' });

      await expect(
        accountDeletionService.requestChildProfileDeletion(PARENT_ID, CHILD_ID, {
          password: 'secret123',
          confirmText: 'DELETE',
        })
      ).rejects.toThrow('A deletion request for this child profile is already in progress');
    });
  });

  describe('requestParentAccountDeletion', () => {
    it('deactivates parent and children and creates account deletion request', async () => {
      const user = mockPasswordUser({ paymentProvider: 'pagseguro' });
      User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
      AccountDeletionRequest.create.mockResolvedValue({
        _id: REQUEST_ID,
        type: 'parent_account',
      });

      const result = await accountDeletionService.requestParentAccountDeletion(PARENT_ID, {
        password: 'secret123',
        confirmText: 'delete',
        requesterIp: '10.0.0.1',
      });

      expect(user.isActive).toBe(false);
      expect(user.planKidsLimit).toBeNull();
      expect(user.save).toHaveBeenCalled();
      expect(ChildProfile.updateMany).toHaveBeenCalledWith(
        { parent: PARENT_ID },
        { isActive: false }
      );
      expect(AccountDeletionRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'parent_account',
          userId: PARENT_ID,
          status: 'pending',
        })
      );
      expect(mailService.sendDeletionRequested).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'parent@example.com', type: 'parent_account' })
      );
      expect(result.accessRevoked).toBe(true);
      expect(result.subscriptionNotes).toContain('PagSeguro');
      expect(AccountDeletionRequest.updateMany).toHaveBeenCalled();
    });

    it('supersedes pending child deletion requests when parent deletes account', async () => {
      const user = mockPasswordUser();
      User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
      AccountDeletionRequest.create.mockResolvedValue({
        _id: REQUEST_ID,
        type: 'parent_account',
      });
      AccountDeletionRequest.updateMany.mockResolvedValue({ modifiedCount: 2 });

      await accountDeletionService.requestParentAccountDeletion(PARENT_ID, {
        password: 'secret123',
        confirmText: 'DELETE',
      });

      expect(AccountDeletionRequest.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: PARENT_ID,
          type: 'child_profile',
        }),
        expect.objectContaining({
          $set: expect.objectContaining({ status: 'cancelled' }),
        })
      );
    });

    it('revokes Stripe Family Plan access without calling subscription cancel', async () => {
      const user = mockPasswordUser({
        paymentProvider: 'stripe',
        stripeSubscriptionId: 'cs_test_family_checkout',
        subscriptionStatus: 'active',
      });
      User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
      AccountDeletionRequest.create.mockResolvedValue({ _id: REQUEST_ID, type: 'parent_account' });

      const result = await accountDeletionService.requestParentAccountDeletion(PARENT_ID, {
        password: 'secret123',
        confirmText: 'DELETE',
      });

      expect(cancelSubscription).not.toHaveBeenCalled();
      expect(user.planKidsLimit).toBeNull();
      expect(result.subscriptionNotes).toContain('Stripe Family Plan');
    });

    it('attempts Stripe subscription cancel for legacy subscriptions', async () => {
      const user = mockPasswordUser({
        stripeSubscriptionId: 'sub_123',
        subscriptionStatus: 'active',
      });
      User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
      cancelSubscription.mockResolvedValue({ id: 'sub_123', cancel_at_period_end: true });
      AccountDeletionRequest.create.mockResolvedValue({ _id: REQUEST_ID, type: 'parent_account' });

      const result = await accountDeletionService.requestParentAccountDeletion(PARENT_ID, {
        password: 'secret123',
        confirmText: 'DELETE',
      });

      expect(cancelSubscription).toHaveBeenCalledWith('sub_123');
      expect(result.subscriptionNotes).toContain('Stripe subscription');
    });

    it('rejects non-parent roles', async () => {
      const user = mockPasswordUser({ role: 'admin' });
      User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

      await expect(
        accountDeletionService.requestParentAccountDeletion(PARENT_ID, {
          password: 'secret123',
          confirmText: 'DELETE',
        })
      ).rejects.toThrow('Only parent accounts can use self-service account deletion');
    });

    it('rejects duplicate pending account deletion request', async () => {
      const user = mockPasswordUser();
      User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
      AccountDeletionRequest.findOne.mockResolvedValue({ _id: REQUEST_ID, status: 'pending' });

      await expect(
        accountDeletionService.requestParentAccountDeletion(PARENT_ID, {
          password: 'secret123',
          confirmText: 'DELETE',
        })
      ).rejects.toThrow('An account deletion request is already in progress');
    });
  });

  describe('purgeChildData', () => {
    it('deletes S3 media keys and child-linked Mongo records', async () => {
      ChildProfile.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: CHILD_ID,
          displayName: 'Alex',
          avatar: 'avatars/alex.png',
        }),
      });

      AudioAssignmentProgress.find.mockReturnValue(
        chainLean([{ recordedAudio: 'media1' }])
      );
      ChantProgress.find.mockReturnValue(chainLean([]));
      KidsWallPost.find.mockReturnValue(chainLean([{ images: ['media2'], videos: [] }]));
      Media.find.mockReturnValue(
        chainLean([
          { _id: 'media1', filePath: 'scorm/audio-assignments/a.m4a' },
          { _id: 'media2', filePath: 'kids-wall/b.jpg' },
        ])
      );

      const summary = await accountDeletionService.purgeChildData(CHILD_ID);

      expect(s3Service.deleteByKey).toHaveBeenCalledWith('scorm/audio-assignments/a.m4a');
      expect(s3Service.deleteByKey).toHaveBeenCalledWith('kids-wall/b.jpg');
      expect(s3Service.deleteByKey).toHaveBeenCalledWith('avatars/alex.png');
      expect(ChildProfile.deleteOne).toHaveBeenCalledWith({ _id: CHILD_ID });
      expect(Media.deleteMany).toHaveBeenCalledWith({ _id: { $in: ['media1', 'media2'] } });
      expect(summary).toMatchObject({
        childId: CHILD_ID,
        displayName: 'Alex',
        mediaFilesRemoved: 2,
        avatarRemoved: true,
      });
    });
  });

  describe('executeDeletionRequest', () => {
    it('completes child_profile purge and sends completion email', async () => {
      const requestDoc = {
        _id: REQUEST_ID,
        type: 'child_profile',
        userId: PARENT_ID,
        childId: CHILD_ID,
        status: 'pending',
        save: jest.fn().mockResolvedValue(undefined),
      };
      AccountDeletionRequest.findById.mockResolvedValue({
        _id: REQUEST_ID,
        status: 'pending',
      });
      AccountDeletionRequest.findOneAndUpdate.mockResolvedValue(requestDoc);
      User.findById.mockReturnValue(chainLean({ email: 'parent@example.com' }));
      ChildProfile.findById
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue({ displayName: 'Alex' }),
          }),
        })
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue({
            _id: CHILD_ID,
            displayName: 'Alex',
            avatar: null,
          }),
        });
      emptyMediaFind();

      const result = await accountDeletionService.executeDeletionRequest(REQUEST_ID);

      expect(requestDoc.status).toBe('completed');
      expect(requestDoc.save).toHaveBeenCalled();
      expect(mailService.sendDeletionCompleted).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'parent@example.com', type: 'child_profile' })
      );
      expect(result.purgeSummary).toMatchObject({ childId: CHILD_ID, displayName: 'Alex' });
    });

    it('returns alreadyCompleted for completed requests', async () => {
      AccountDeletionRequest.findById.mockResolvedValue({
        _id: REQUEST_ID,
        status: 'completed',
      });

      const result = await accountDeletionService.executeDeletionRequest(REQUEST_ID);
      expect(result.alreadyCompleted).toBe(true);
    });

    it('completes when child profile was already purged', async () => {
      const requestDoc = {
        _id: REQUEST_ID,
        type: 'child_profile',
        userId: PARENT_ID,
        childId: CHILD_ID,
        status: 'pending',
        save: jest.fn().mockResolvedValue(undefined),
      };
      AccountDeletionRequest.findById.mockResolvedValue({
        _id: REQUEST_ID,
        status: 'pending',
      });
      AccountDeletionRequest.findOneAndUpdate.mockResolvedValue(requestDoc);
      User.findById.mockReturnValue(chainLean({ email: 'parent@example.com' }));
      ChildProfile.findById
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue({ displayName: 'Alex' }),
          }),
        })
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue(null),
        });

      const result = await accountDeletionService.executeDeletionRequest(REQUEST_ID);

      expect(requestDoc.status).toBe('completed');
      expect(result.purgeSummary).toMatchObject({
        alreadyRemoved: true,
        childId: CHILD_ID,
      });
    });

    it('marks request failed when purge throws unexpected error', async () => {
      const requestDoc = {
        _id: REQUEST_ID,
        type: 'child_profile',
        userId: PARENT_ID,
        childId: CHILD_ID,
        status: 'pending',
        save: jest.fn().mockResolvedValue(undefined),
      };
      AccountDeletionRequest.findById.mockResolvedValue({
        _id: REQUEST_ID,
        status: 'pending',
      });
      AccountDeletionRequest.findOneAndUpdate.mockResolvedValue(requestDoc);
      User.findById.mockReturnValue(chainLean({ email: 'parent@example.com' }));
      ChildProfile.findById
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue({ displayName: 'Alex' }),
          }),
        })
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue({
            _id: CHILD_ID,
            displayName: 'Alex',
            avatar: null,
          }),
        });
      emptyMediaFind();
      Progress.deleteMany.mockRejectedValueOnce(new Error('Database unavailable'));

      await expect(accountDeletionService.executeDeletionRequest(REQUEST_ID)).rejects.toThrow(
        'Database unavailable'
      );
      expect(requestDoc.status).toBe('failed');
      expect(requestDoc.errorMessage).toContain('Database unavailable');
    });
  });

  describe('recoverStaleProcessingRequests', () => {
    it('resets stale processing requests to pending', async () => {
      AccountDeletionRequest.updateMany.mockResolvedValue({ modifiedCount: 2 });

      const count = await accountDeletionService.recoverStaleProcessingRequests();

      expect(count).toBe(2);
      expect(AccountDeletionRequest.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'processing' }),
        expect.objectContaining({
          $set: expect.objectContaining({ status: 'pending' }),
        })
      );
    });
  });

  describe('executeAllPendingRequests', () => {
    it('queries only due pending requests by default', async () => {
      const sort = jest.fn().mockResolvedValue([]);
      AccountDeletionRequest.find.mockReturnValue({ sort });
      AccountDeletionRequest.updateMany.mockResolvedValue({ modifiedCount: 0 });

      await accountDeletionService.executeAllPendingRequests();

      expect(AccountDeletionRequest.find).toHaveBeenCalledWith({
        status: 'pending',
        scheduledPurgeAt: { $lte: expect.any(Date) },
      });
    });

    it('can process all pending requests when dueOnly is false', async () => {
      const sort = jest.fn().mockResolvedValue([]);
      AccountDeletionRequest.find.mockReturnValue({ sort });

      await accountDeletionService.executeAllPendingRequests({ dueOnly: false });

      expect(AccountDeletionRequest.find).toHaveBeenCalledWith({ status: 'pending' });
    });
  });
});
