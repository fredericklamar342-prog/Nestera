import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateGoalDto } from './create-goal.dto';

describe('CreateGoalDto', () => {
  describe('goalName validation', () => {
    it('should pass with valid goal name', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);

      const dto = plainToInstance(CreateGoalDto, {
        goalName: 'Buy a Car',
        targetAmount: 50000,
        targetDate: futureDate.toISOString(),
      });

      const errors = await validate(dto);
      if (errors.length > 0) {
        console.log('Validation errors:', JSON.stringify(errors, null, 2));
      }
      expect(errors.length).toBe(0);
    });

    it('should fail when goal name is empty', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);

      const dto = plainToInstance(CreateGoalDto, {
        goalName: '',
        targetAmount: 50000,
        targetDate: futureDate.toISOString(),
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('goalName');
    });

    it('should fail when goal name exceeds 255 characters', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);

      const dto = plainToInstance(CreateGoalDto, {
        goalName: 'a'.repeat(256),
        targetAmount: 50000,
        targetDate: futureDate.toISOString(),
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('goalName');
    });
  });

  describe('targetAmount validation', () => {
    it('should pass with valid target amount', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);

      const dto = plainToInstance(CreateGoalDto, {
        goalName: 'Emergency Fund',
        targetAmount: 10000,
        targetDate: futureDate.toISOString(),
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when target amount is less than 0.01', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);

      const dto = plainToInstance(CreateGoalDto, {
        goalName: 'Small Goal',
        targetAmount: 0.001,
        targetDate: futureDate.toISOString(),
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const amountError = errors.find((e) => e.property === 'targetAmount');
      expect(amountError).toBeDefined();
    });

    it('should fail when target amount is not a number', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);

      const dto = plainToInstance(CreateGoalDto, {
        goalName: 'Invalid Amount',
        targetAmount: 'not-a-number',
        targetDate: futureDate.toISOString(),
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const amountError = errors.find((e) => e.property === 'targetAmount');
      expect(amountError).toBeDefined();
    });
  });

  describe('targetDate validation', () => {
    it('should pass with valid future date (ISO string)', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const dto = plainToInstance(CreateGoalDto, {
        goalName: 'Future Goal',
        targetAmount: 5000,
        targetDate: futureDate.toISOString(),
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass with valid future date (Date object)', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const dto = plainToInstance(CreateGoalDto, {
        goalName: 'Future Goal',
        targetAmount: 5000,
        targetDate: futureDate,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when target date is in the past', async () => {
      const pastDate = new Date('2020-01-01');

      const dto = plainToInstance(CreateGoalDto, {
        goalName: 'Past Goal',
        targetAmount: 5000,
        targetDate: pastDate,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const dateError = errors.find((e) => e.property === 'targetDate');
      expect(dateError).toBeDefined();
      expect(dateError?.constraints).toHaveProperty('isFutureDate');
    });

    it('should fail when target date is today', async () => {
      const today = new Date();

      const dto = plainToInstance(CreateGoalDto, {
        goalName: 'Today Goal',
        targetAmount: 5000,
        targetDate: today,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const dateError = errors.find((e) => e.property === 'targetDate');
      expect(dateError).toBeDefined();
    });

    it('should fail when target date is invalid', async () => {
      const dto = plainToInstance(CreateGoalDto, {
        goalName: 'Invalid Date',
        targetAmount: 5000,
        targetDate: 'not-a-date',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const dateError = errors.find((e) => e.property === 'targetDate');
      expect(dateError).toBeDefined();
    });
  });

  describe('metadata validation', () => {
    it('should pass with valid metadata', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);

      const dto = plainToInstance(CreateGoalDto, {
        goalName: 'Goal with Metadata',
        targetAmount: 5000,
        targetDate: futureDate.toISOString(),
        metadata: {
          imageUrl: 'https://example.com/image.jpg',
          iconRef: 'car-icon',
          color: '#4F46E5',
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass when metadata is omitted', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);

      const dto = plainToInstance(CreateGoalDto, {
        goalName: 'Goal without Metadata',
        targetAmount: 5000,
        targetDate: futureDate.toISOString(),
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when metadata is not an object', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);

      const dto = plainToInstance(CreateGoalDto, {
        goalName: 'Invalid Metadata',
        targetAmount: 5000,
        targetDate: futureDate.toISOString(),
        metadata: 'not-an-object',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const metadataError = errors.find((e) => e.property === 'metadata');
      expect(metadataError).toBeDefined();
    });
  });

  describe('complete validation', () => {
    it('should pass with all valid fields', async () => {
      const dto = plainToInstance(CreateGoalDto, {
        goalName: 'Complete Goal',
        targetAmount: 25000,
        targetDate: '2027-06-15T00:00:00.000Z',
        metadata: {
          imageUrl: 'https://cdn.nestera.io/goals/vacation.jpg',
          iconRef: 'vacation-icon',
          color: '#10B981',
        },
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.goalName).toBe('Complete Goal');
      expect(dto.targetAmount).toBe(25000);
      expect(dto.targetDate).toBeInstanceOf(Date);
      expect(dto.metadata).toBeDefined();
    });
  });
});
