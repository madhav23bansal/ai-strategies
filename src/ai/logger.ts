interface LogContext {
  [key: string]: any;
}

interface Logger {
  info: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  debug: (message: string, context?: LogContext) => void;
}

export function createLogger(module: string): Logger {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    info: (message: string, context?: LogContext) => {
      console.log(`[${new Date().toISOString()}] [INFO] [${module}] ${message}`, context ? JSON.stringify(context, null, 2) : '');
    },
    
    error: (message: string, context?: LogContext) => {
      console.error(`[${new Date().toISOString()}] [ERROR] [${module}] ${message}`, context ? JSON.stringify(context, null, 2) : '');
    },
    
    warn: (message: string, context?: LogContext) => {
      console.warn(`[${new Date().toISOString()}] [WARN] [${module}] ${message}`, context ? JSON.stringify(context, null, 2) : '');
    },
    
    debug: (message: string, context?: LogContext) => {
      if (isDevelopment) {
        console.debug(`[${new Date().toISOString()}] [DEBUG] [${module}] ${message}`, context ? JSON.stringify(context, null, 2) : '');
      }
    }
  };
}
