// Centralized error message handling - maps technical errors to user-friendly messages

export interface UserFriendlyError {
  title: string;
  message: string;
  action?: string;
  type: 'permission' | 'validation' | 'payment' | 'system' | 'network';
}

// Pattern matching for common database/API errors
const errorPatterns: Array<{
  pattern: RegExp | string;
  error: UserFriendlyError;
}> = [
  // RLS / Permission errors
  {
    pattern: /row-level security policy/i,
    error: {
      title: "You don't have permission",
      message: "Your role doesn't allow this action.",
      action: "Ask a Company Admin to grant access.",
      type: 'permission'
    }
  },
  {
    pattern: /permission denied/i,
    error: {
      title: "Access Denied",
      message: "You don't have the required permissions for this action.",
      action: "Contact your administrator for access.",
      type: 'permission'
    }
  },
  {
    pattern: /not authorized/i,
    error: {
      title: "Not Authorized",
      message: "You need to be logged in to perform this action.",
      action: "Please sign in and try again.",
      type: 'permission'
    }
  },
  
  // Authentication errors
  {
    pattern: /invalid login credentials/i,
    error: {
      title: "Login Failed",
      message: "The email or password you entered is incorrect.",
      action: "Check your credentials and try again.",
      type: 'validation'
    }
  },
  {
    pattern: /email not confirmed/i,
    error: {
      title: "Email Not Verified",
      message: "Please verify your email address before signing in.",
      action: "Check your inbox for the verification link.",
      type: 'validation'
    }
  },
  {
    pattern: /already registered/i,
    error: {
      title: "Account Exists",
      message: "An account with this email already exists.",
      action: "Try signing in instead or reset your password.",
      type: 'validation'
    }
  },
  
  // Duplicate / Constraint errors
  {
    pattern: /duplicate key|unique constraint|already exists/i,
    error: {
      title: "Already Exists",
      message: "This item already exists in the system.",
      action: "Try using a different name or value.",
      type: 'validation'
    }
  },
  {
    pattern: /foreign key|referenced by/i,
    error: {
      title: "Cannot Complete Action",
      message: "This item is linked to other records and cannot be modified.",
      action: "Remove related items first, then try again.",
      type: 'validation'
    }
  },
  
  // Network / Connection errors
  {
    pattern: /network|fetch|connection|timeout/i,
    error: {
      title: "Connection Error",
      message: "Unable to connect to the server.",
      action: "Check your internet connection and try again.",
      type: 'network'
    }
  },
  {
    pattern: /rate limit|too many requests/i,
    error: {
      title: "Too Many Requests",
      message: "You've made too many requests. Please wait a moment.",
      action: "Wait a few seconds and try again.",
      type: 'network'
    }
  },
  
  // Payment errors
  {
    pattern: /payment|billing|subscription|card/i,
    error: {
      title: "Payment Issue",
      message: "There was a problem processing your payment.",
      action: "Check your payment details and try again.",
      type: 'payment'
    }
  },
  {
    pattern: /trial.*expired|subscription.*expired/i,
    error: {
      title: "Subscription Expired",
      message: "Your trial or subscription has ended.",
      action: "Upgrade your plan to continue using this feature.",
      type: 'payment'
    }
  },
  
  // Validation errors
  {
    pattern: /invalid.*email/i,
    error: {
      title: "Invalid Email",
      message: "Please enter a valid email address.",
      action: "Check the format and try again.",
      type: 'validation'
    }
  },
  {
    pattern: /required|cannot be empty|must be provided/i,
    error: {
      title: "Missing Information",
      message: "Please fill in all required fields.",
      action: "Complete the highlighted fields and try again.",
      type: 'validation'
    }
  },
  {
    pattern: /too long|maximum.*characters|exceeds.*limit/i,
    error: {
      title: "Input Too Long",
      message: "The text you entered is too long.",
      action: "Shorten your input and try again.",
      type: 'validation'
    }
  },
  
  // File / Storage errors
  {
    pattern: /file.*too large|upload.*size/i,
    error: {
      title: "File Too Large",
      message: "The file you're trying to upload exceeds the size limit.",
      action: "Try uploading a smaller file.",
      type: 'validation'
    }
  },
  {
    pattern: /unsupported.*format|invalid.*file.*type/i,
    error: {
      title: "Unsupported File Type",
      message: "This file format is not supported.",
      action: "Try uploading a different file format.",
      type: 'validation'
    }
  },
];

// Module-specific error context
const moduleContexts: Record<string, string> = {
  employees: "employee",
  locations: "location",
  audits: "audit",
  shifts: "shift",
  equipment: "equipment",
  documents: "document",
  notifications: "notification",
  templates: "template",
  integrations: "integration",
};

/**
 * Converts a technical error message to a user-friendly format
 */
export function getUserFriendlyError(
  technicalError: string | Error,
  context?: string
): UserFriendlyError {
  const errorMessage = technicalError instanceof Error 
    ? technicalError.message 
    : technicalError;
  
  // Log technical details internally (for debugging)
  console.error('[Technical Error]', errorMessage);
  
  // Find matching pattern
  for (const { pattern, error } of errorPatterns) {
    const matches = typeof pattern === 'string' 
      ? errorMessage.toLowerCase().includes(pattern.toLowerCase())
      : pattern.test(errorMessage);
    
    if (matches) {
      // Add context if available
      if (context && moduleContexts[context]) {
        return {
          ...error,
          message: error.message.replace('this action', `managing ${moduleContexts[context]}s`),
        };
      }
      return error;
    }
  }
  
  // Default fallback for unmatched errors
  return {
    title: "Something Went Wrong",
    message: "An unexpected error occurred. Please try again.",
    action: "If this continues, contact support.",
    type: 'system'
  };
}

/**
 * Creates a toast-friendly error message
 */
export function getToastError(
  technicalError: string | Error,
  context?: string
): { title: string; description: string } {
  const friendly = getUserFriendlyError(technicalError, context);
  return {
    title: friendly.title,
    description: friendly.action ? `${friendly.message} ${friendly.action}` : friendly.message,
  };
}

/**
 * Wraps an async function with user-friendly error handling
 */
export async function withFriendlyErrors<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const friendly = getUserFriendlyError(error as Error, context);
    throw new Error(friendly.message);
  }
}
