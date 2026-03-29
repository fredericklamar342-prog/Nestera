import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Custom validator to ensure a date is strictly in the future.
 * Validates that the provided date is after the current date/time.
 */
export function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isFutureDate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!(value instanceof Date)) {
            return false;
          }

          const now = new Date();
          // Reset time to start of day for date-only comparison
          now.setHours(0, 0, 0, 0);

          const targetDate = new Date(value);
          targetDate.setHours(0, 0, 0, 0);

          return targetDate > now;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a date in the future`;
        },
      },
    });
  };
}
