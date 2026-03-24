import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Validates that a string is a valid Stellar public key.
 * Stellar public keys:
 * - Start with 'G' (Ed25519 public key)
 * - Are exactly 56 characters long
 * - Use Base32 encoding (A-Z, 2-7)
 *
 * @param validationOptions Optional validation options
 * @returns Decorator function
 */
export function IsStellarPublicKey(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStellarPublicKey',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') {
            return false;
          }

          // Stellar public keys: start with G, exactly 56 chars, Base32 (A-Z, 2-7)
          const stellarKeyPattern = /^G[A-Z2-7]{54}$/;
          return stellarKeyPattern.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid Stellar public key (starts with G, exactly 56 characters, Base32 encoded)`;
        },
      },
    });
  };
}

/**
 * Validates that a string is a valid Soroban contract ID.
 * Soroban contract IDs:
 * - Start with 'C' (Contract)
 * - Are exactly 56 characters long
 * - Use Base32 encoding (A-Z, 2-7)
 *
 * @param validationOptions Optional validation options
 * @returns Decorator function
 */
export function IsSorobanContractId(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSorobanContractId',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') {
            return false;
          }

          // Soroban contract IDs: start with C, exactly 56 chars, Base32 (A-Z, 2-7)
          const sorobanContractPattern = /^C[A-Z2-7]{54}$/;
          return sorobanContractPattern.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid Soroban contract ID (starts with C, exactly 56 characters, Base32 encoded)`;
        },
      },
    });
  };
}
