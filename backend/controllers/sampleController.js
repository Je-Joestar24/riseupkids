// Sample controller for demonstration
// This can be removed or used as a template for other controllers

const getSampleData = (req, res) => {
  res.json({
    success: true,
    message: 'Sample controller is working!',
    data: {
      example: 'This is a sample controller',
      timestamp: new Date().toISOString()
    }
  });
};

module.exports = {
  getSampleData
};

