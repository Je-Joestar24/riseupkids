/**
 * Manual mock for models – used by tests/resetcode.test.js.
 * Set global.__resetCodeMockUser to control User.findOne result (null or user object).
 */
function getMockUserResult() {
  return typeof global.__resetCodeMockUser !== 'undefined' ? global.__resetCodeMockUser : null;
}

function chainableUserResult() {
  const r = getMockUserResult();
  return {
    select: function select() {
      return Promise.resolve(r);
    },
    then: function then(resolve, reject) {
      return Promise.resolve(r).then(resolve, reject);
    },
    catch: function catchFn() {
      return this;
    },
  };
}

const User = {
  findOne: jest.fn().mockImplementation(() => chainableUserResult()),
  findById: jest.fn().mockImplementation(() => ({
    select: jest.fn().mockResolvedValue(getMockUserResult()),
  })),
};

const PasswordResetToken = {
  deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
  create: jest.fn().mockResolvedValue({}),
  findOne: jest.fn().mockResolvedValue(null),
  deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
};

const LoginOtpToken = {
  deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
  create: jest.fn().mockResolvedValue({}),
  findOne: jest.fn().mockResolvedValue(null),
  deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
};

const stub = { findOne: jest.fn(), find: jest.fn(), findById: jest.fn() };

module.exports = {
  User,
  PasswordResetToken,
  LoginOtpToken,
  ChildProfile: stub,
  ChildStats: stub,
  Journey: stub,
  Lesson: stub,
  LessonItem: stub,
  Media: stub,
  Book: stub,
  Activity: stub,
  Progress: stub,
  Announcement: stub,
  Badge: stub,
  KidsWallPost: stub,
  BookReading: stub,
  AudioAssignment: stub,
  AudioAssignmentProgress: stub,
  Chant: stub,
  ChantProgress: stub,
  StarEarning: stub,
  ExploreContent: stub,
  ActivityGroup: stub,
  Course: stub,
  CourseProgress: stub,
  VideoWatch: stub,
  ContactSupport: stub,
  GoogleIntegration: stub,
  Meeting: stub,
  YouTubeLive: stub,
};
