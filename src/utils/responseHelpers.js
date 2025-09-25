// Consistent response formatting across the application

// ============================================================================
// SUCCESS RESPONSES
// ============================================================================

export const sendSuccessResponse = (res, data, message, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message: message,
    data: data
  });
};

export const sendCreatedResponse = (res, data, message = 'Resource created successfully') => {
  return sendSuccessResponse(res, data, message, 201);
};

// ============================================================================
// ERROR RESPONSES
// ============================================================================

export const sendErrorResponse = (res, error, statusCode = 500, details = null) => {
  const response = {
    success: false,
    error: error
  };
  
  if (details) {
    response.details = details;
  }
  
  return res.status(statusCode).json(response);
};

export const sendBadRequestResponse = (res, error) => {
  return sendErrorResponse(res, error, 400);
};

export const sendUnauthorizedResponse = (res, error = 'Unauthorized') => {
  return sendErrorResponse(res, error, 401);
};

export const sendForbiddenResponse = (res, error, additionalData = null) => {
  const response = {
    success: false,
    error: error
  };
  
  if (additionalData) {
    Object.assign(response, additionalData);
  }
  
  return res.status(403).json(response);
};

export const sendInternalServerErrorResponse = (res, error = 'Internal server error', details = null) => {
  return sendErrorResponse(res, error, 500, details);
};

// ============================================================================
// VALIDATION ERROR RESPONSES
// ============================================================================

export const sendValidationErrorResponse = (res, validationResult) => {
  if (validationResult.availableRoles) {
    return sendForbiddenResponse(res, validationResult.error, {
      availableRoles: validationResult.availableRoles
    });
  }
  return sendBadRequestResponse(res, validationResult.error);
};

// ============================================================================
// LOGGING HELPERS
// ============================================================================

export const logRequest = (req, operation) => {
  console.log(`${operation} request:`, req.body);
};

export const logError = (operation, error) => {
  console.error(`${operation} error:`, error);
};