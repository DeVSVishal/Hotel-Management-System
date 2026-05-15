export interface PasswordValidationResult {
  valid: boolean
  errors: string[]
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = []
  if (password.length < 8) errors.push('Minimum 8 characters')
  if (!/[A-Z]/.test(password)) errors.push('Must contain an uppercase letter')
  if (!/[a-z]/.test(password)) errors.push('Must contain a lowercase letter')
  if (!/[0-9]/.test(password)) errors.push('Must contain a number')
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('Must contain a special character')
  return { valid: errors.length === 0, errors }
}
