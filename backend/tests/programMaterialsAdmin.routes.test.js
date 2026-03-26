describe('programMaterialsAdmin.routes - endpoints', () => {
  it('contains required admin printable routes', () => {
    const router = require('../routes/programMaterialsAdmin.routes');

    const hasModulesGet = router.stack.some(
      (l) => l.route && l.route.path === '/modules' && l.route.methods.get
    );
    const hasCoursePrintablesGet = router.stack.some(
      (l) => l.route && l.route.path === '/modules/:courseId/printables' && l.route.methods.get
    );
    const hasAddPrintablePost = router.stack.some(
      (l) => l.route && l.route.path === '/modules/:courseId/printables' && l.route.methods.post
    );

    expect(hasModulesGet).toBe(true);
    expect(hasCoursePrintablesGet).toBe(true);
    expect(hasAddPrintablePost).toBe(true);
  });
});

