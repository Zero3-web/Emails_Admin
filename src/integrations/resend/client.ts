export function requireResendKey(){const key=process.env.RESEND_API_KEY;if(!key)throw new Error("Resend integration not configured");return key}
