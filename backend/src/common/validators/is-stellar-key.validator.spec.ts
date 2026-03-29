import { validate } from 'class-validator';
import { IsStellarPublicKey } from './is-stellar-key.validator';

class TestDto {
  @IsStellarPublicKey()
  publicKey: string;
}

describe('IsStellarPublicKey', () => {
  it('accepts valid 56-char Stellar public keys starting with G', async () => {
    const dto = new TestDto();
    dto.publicKey = `G${'A'.repeat(55)}`;

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects keys with invalid prefix', async () => {
    const dto = new TestDto();
    dto.publicKey = `S${'A'.repeat(55)}`;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects keys shorter than 56 chars', async () => {
    const dto = new TestDto();
    dto.publicKey = `G${'A'.repeat(54)}`;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects keys longer than 56 chars', async () => {
    const dto = new TestDto();
    dto.publicKey = `G${'A'.repeat(56)}`;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects non-base32 characters', async () => {
    const dto = new TestDto();
    dto.publicKey = `G${'A'.repeat(54)}!`;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
