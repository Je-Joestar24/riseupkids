import { lazyChunk } from '../utils/lazyChunk';
import AuthLogin from '../pages/auth/AuthLogin';

/**
 * Every page and layout the router can draw, by name. Each one is its own downloadable chunk, so a
 * visitor only fetches the code of the area they are in. The sign-in page is the one exception: it is
 * the front door for everybody, so it ships with the first download.
 */
export const ROUTE_COMPONENTS = {
  // Signed-out
  AuthLogin,
  AdminLoginOtp: lazyChunk(() => import('../pages/auth/AdminLoginOtp')),
  LoginTwoFactor: lazyChunk(() => import('../pages/auth/LoginTwoFactor')),
  ForgetPassword: lazyChunk(() => import('../pages/auth/ForgetPassword')),
  SendCode: lazyChunk(() => import('../pages/auth/SendCode')),
  ResetPassword: lazyChunk(() => import('../pages/auth/ResetPassword')),
  ParentSignup: lazyChunk(() => import('../pages/auth/ParentSignup')),
  ParentSignupSuccess: lazyChunk(() => import('../pages/auth/ParentSignupSuccess')),
  ParentSignupCancel: lazyChunk(() => import('../pages/auth/ParentSignupCancel')),

  // Parent
  ParentsLogin: lazyChunk(() => import('../pages/parents/ParentsLogin')),
  ParentsChild: lazyChunk(() => import('../pages/parents/ParentsChild')),
  ParentDashboard: lazyChunk(() => import('../pages/parents/ParentDashboard')),
  ParentsDashboardPrintableTab: lazyChunk(() => import('../pages/parents/ParentsDashboardPrintableTab')),
  ParentsLayout: lazyChunk(() => import('../layouts/ParentsLayout')),

  // Admin
  AdminLayout: lazyChunk(() => import('../layouts/AdminLayout')),
  AdminSetupTwoFactor: lazyChunk(() => import('../pages/admin/AdminSetupTwoFactor')),
  AdminDashboard: lazyChunk(() => import('../pages/admin/AdminDashboard')),
  AdminDeletionRequests: lazyChunk(() => import('../pages/admin/AdminDeletionRequests')),
  AdminUsers: lazyChunk(() => import('../pages/admin/AdminUsers')),
  AdminModuleAccess: lazyChunk(() => import('../pages/admin/AdminModuleAccess')),
  AdminNotifications: lazyChunk(() => import('../pages/admin/AdminNotifications')),
  AdminActivities: lazyChunk(() => import('../pages/admin/AdminActivities')),
  AdminCourses: lazyChunk(() => import('../pages/admin/AdminCourses')),
  AdminExplore: lazyChunk(() => import('../pages/admin/AdminExplore')),
  AdminKidsWall: lazyChunk(() => import('../pages/admin/AdminKidsWall')),
  AdminCheckingAudio: lazyChunk(() => import('../pages/admin/AdminCheckingAudio')),
  AdminMeetings: lazyChunk(() => import('../pages/admin/AdminMeetings')),
  AdminYoutubeLive: lazyChunk(() => import('../pages/admin/AdminYoutubeLive')),
  AdminPrintables: lazyChunk(() => import('../pages/admin/AdminPrintables')),
  AdminLessonPlans: lazyChunk(() => import('../pages/admin/AdminLessonPlans')),
  AdminBooksBuilder: lazyChunk(() => import('../pages/admin/AdminBooksBuilder')),
  AdminBooksBuilderCreate: lazyChunk(() => import('../pages/admin/AdminBooksBuilderCreate')),
  AdminStarCamMissions: lazyChunk(() => import('../pages/admin/AdminStarCamMissions')),

  // Content creator
  ContentCreatorLayout: lazyChunk(() => import('../layouts/ContentCreatorLayout')),
  ContentCreatorDashboard: lazyChunk(() => import('../pages/contentcreator/ContentCreatorDashboard')),

  // Teacher
  TeacherLayout: lazyChunk(() => import('../layouts/TeacherLayout')),
  TeacherDashboard: lazyChunk(() => import('../pages/teacher/TeacherDashboard')),

  // Child area: the shared frame, then one chunk per page
  ChildShell: lazyChunk(() => import('./ChildShell')),
  ChildHome: lazyChunk(() => import('../pages/child/ChildHome')),
  ChildJourney: lazyChunk(() => import('../pages/child/ChildJourney')),
  ChildJourneyModule: lazyChunk(() => import('../pages/child/ChildJourneyModule')),
  ChildModulePrintables: lazyChunk(() => import('../pages/child/ChildModulePrintables')),
  ChildKidsWall: lazyChunk(() => import('../pages/child/ChildKidsWall')),
  ChildShareSomething: lazyChunk(() => import('../pages/child/ChildShareSomething')),
  ChildExplore: lazyChunk(() => import('../pages/child/ChildExplore')),
  ChildExploreVideos: lazyChunk(() => import('../pages/child/ChildExploreVideos')),
  ChildExploreReplays: lazyChunk(() => import('../pages/child/ChildExploreReplays')),
  ChildProfile: lazyChunk(() => import('../pages/child/ChildProfile')),
};
