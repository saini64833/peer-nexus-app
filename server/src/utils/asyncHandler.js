const asyncHandler = (requestHandler) => async (req, res, next) => {
  try {
    return await requestHandler(req, res, next);
  } catch (error) {
    const statusCode =
      error.statusCode && error.statusCode >= 100 && error.statusCode < 1000
        ? error.statusCode
        : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

export { asyncHandler };