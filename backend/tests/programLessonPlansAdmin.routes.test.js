describe('programLessonPlansAdmin.routes - endpoints', () => {
  it('contains required admin lesson plan routes', () => {
    const router = require('../routes/programLessonPlansAdmin.routes');

    const hasModulesGet = router.stack.some(
      (l) => l.route && l.route.path === '/modules' && l.route.methods.get
    );
    const hasCourseLessonPlansGet = router.stack.some(
      (l) => l.route && l.route.path === '/modules/:courseId/lesson-plans' && l.route.methods.get
    );
    const hasAddLessonPlanPost = router.stack.some(
      (l) => l.route && l.route.path === '/modules/:courseId/lesson-plans' && l.route.methods.post
    );

    expect(hasModulesGet).toBe(true);
    expect(hasCourseLessonPlansGet).toBe(true);
    expect(hasAddLessonPlanPost).toBe(true);
  });
});
