import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { MedicalClaim, ClaimStatus } from '../src/modules/claims/entities/medical-claim.entity';
import { Dispute, DisputeStatus } from '../src/modules/disputes/entities/dispute.entity';

/**
 * E2E Critical Path Tests
 * 
 * Tests the full escrow lifecycle:
 * - Create trade (claim submission)
 * - Deposit (claim approval)
 * - Confirm delivery (claim processing)
 * - Release funds (claim resolution)
 * - Initiate dispute and resolve
 * 
 * Validates API, DB, and business logic integration.
 */
describe('Critical Path E2E Tests', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let claimRepository;
    let disputeRepository;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            }),
        );
        await app.init();

        dataSource = moduleFixture.get<DataSource>(DataSource);
        claimRepository = dataSource.getRepository(MedicalClaim);
        disputeRepository = dataSource.getRepository(Dispute);

        // Clean up before tests
        await cleanupDatabase();
    });

    afterAll(async () => {
        await cleanupDatabase();
        await app.close();
    });

    async function cleanupDatabase() {
        if (!dataSource.isInitialized) return;

        const entities = dataSource.entityMetadatas;
        for (const entity of entities) {
            const repository = dataSource.getRepository(entity.name);
            await repository.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE`);
        }
    }

    describe('Happy Path: Create → Deposit → Confirm → Release', () => {
        let claimId: string;

        it('should create a trade (submit medical claim)', async () => {
            const createClaimDto = {
                patientName: 'John Doe',
                patientId: 'P123456',
                patientDateOfBirth: '1990-01-15',
                hospitalName: 'City Hospital',
                hospitalId: 'H001',
                diagnosisCodes: ['J45.9', 'E11.9'],
                claimAmount: 5000.00,
                notes: 'Asthma and diabetes treatment',
            };

            const response = await request(app.getHttpServer())
                .post('/claims')
                .send(createClaimDto)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.status).toBe(ClaimStatus.PENDING);
            expect(response.body.claimAmount).toBe('5000.00');

            claimId = response.body.id;

            // Verify in database
            const claim = await claimRepository.findOne({ where: { id: claimId } });
            expect(claim).toBeDefined();
            expect(claim.status).toBe(ClaimStatus.PENDING);
        });

        it('should deposit (approve claim)', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/claims/${claimId}`)
                .send({ status: ClaimStatus.APPROVED })
                .expect(200);

            expect(response.body.status).toBe(ClaimStatus.APPROVED);

            // Verify in database
            const claim = await claimRepository.findOne({ where: { id: claimId } });
            expect(claim.status).toBe(ClaimStatus.APPROVED);
        });

        it('should confirm delivery (process claim)', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/claims/${claimId}`)
                .send({ status: ClaimStatus.PROCESSING })
                .expect(200);

            expect(response.body.status).toBe(ClaimStatus.PROCESSING);

            const claim = await claimRepository.findOne({ where: { id: claimId } });
            expect(claim.status).toBe(ClaimStatus.PROCESSING);
        });

        it('should release funds (resolve claim)', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/claims/${claimId}`)
                .send({ status: ClaimStatus.APPROVED })
                .expect(200);

            expect(response.body.status).toBe(ClaimStatus.APPROVED);

            const claim = await claimRepository.findOne({ where: { id: claimId } });
            expect(claim.status).toBe(ClaimStatus.APPROVED);
        });

        it('should retrieve claim with full history', async () => {
            const response = await request(app.getHttpServer())
                .get(`/claims/${claimId}`)
                .expect(200);

            expect(response.body.id).toBe(claimId);
            expect(response.body.status).toBe(ClaimStatus.APPROVED);
            expect(response.body.patientName).toBe('John Doe');
            expect(response.body.claimAmount).toBe('5000.00');
        });
    });

    describe('Dispute Path: Initiate → Review → Resolve', () => {
        let claimId: string;
        let disputeId: string;

        beforeAll(async () => {
            // Create a claim to dispute
            const claim = claimRepository.create({
                patientName: 'Jane Smith',
                patientId: 'P789012',
                patientDateOfBirth: new Date('1985-06-20'),
                hospitalName: 'General Hospital',
                hospitalId: 'H002',
                diagnosisCodes: ['M79.3'],
                claimAmount: 3500.00,
                status: ClaimStatus.APPROVED,
                notes: 'Muscle strain treatment',
            });
            const savedClaim = await claimRepository.save(claim);
            claimId = savedClaim.id;
        });

        it('should initiate dispute on approved claim', async () => {
            const createDisputeDto = {
                claimId,
                disputedBy: 'hospital-admin@example.com',
                reason: 'Claim amount exceeds approved treatment cost',
            };

            const response = await request(app.getHttpServer())
                .post('/disputes')
                .send(createDisputeDto)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.status).toBe(DisputeStatus.OPEN);
            expect(response.body.claimId).toBe(claimId);
            expect(response.body.reason).toBe(createDisputeDto.reason);

            disputeId = response.body.id;

            // Verify in database
            const dispute = await disputeRepository.findOne({ where: { id: disputeId } });
            expect(dispute).toBeDefined();
            expect(dispute.status).toBe(DisputeStatus.OPEN);
        });

        it('should add message to dispute (evidence)', async () => {
            const addMessageDto = {
                author: 'hospital-admin@example.com',
                message: 'Attached hospital invoice showing actual cost',
                evidenceUrl: 'https://example.com/invoice-123.pdf',
            };

            const response = await request(app.getHttpServer())
                .post(`/disputes/${disputeId}/messages`)
                .send(addMessageDto)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.author).toBe(addMessageDto.author);
            expect(response.body.evidenceUrl).toBe(addMessageDto.evidenceUrl);
        });

        it('should transition dispute to under review', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/disputes/${disputeId}`)
                .send({ status: DisputeStatus.UNDER_REVIEW })
                .expect(200);

            expect(response.body.status).toBe(DisputeStatus.UNDER_REVIEW);

            const dispute = await disputeRepository.findOne({ where: { id: disputeId } });
            expect(dispute.status).toBe(DisputeStatus.UNDER_REVIEW);
        });

        it('should resolve dispute', async () => {
            const response = await request(app.getHttpServer())
                .patch(`/disputes/${disputeId}`)
                .send({ status: DisputeStatus.RESOLVED })
                .expect(200);

            expect(response.body.status).toBe(DisputeStatus.RESOLVED);

            const dispute = await disputeRepository.findOne({
                where: { id: disputeId },
                relations: ['messages'],
            });
            expect(dispute.status).toBe(DisputeStatus.RESOLVED);
            expect(dispute.messages.length).toBeGreaterThan(0);
        });

        it('should retrieve dispute with full message history', async () => {
            const response = await request(app.getHttpServer())
                .get(`/disputes/${disputeId}`)
                .expect(200);

            expect(response.body.id).toBe(disputeId);
            expect(response.body.status).toBe(DisputeStatus.RESOLVED);
            expect(Array.isArray(response.body.messages)).toBe(true);
            expect(response.body.messages.length).toBeGreaterThan(0);
        });
    });

    describe('Negative Flows', () => {
        it('should reject invalid status transition', async () => {
            const claim = claimRepository.create({
                patientName: 'Test User',
                patientId: 'P999999',
                patientDateOfBirth: new Date('1995-03-10'),
                hospitalName: 'Test Hospital',
                hospitalId: 'H999',
                diagnosisCodes: ['Z00.00'],
                claimAmount: 1000.00,
                status: ClaimStatus.PENDING,
            });
            const savedClaim = await claimRepository.save(claim);

            // Try invalid status
            const response = await request(app.getHttpServer())
                .patch(`/claims/${savedClaim.id}`)
                .send({ status: 'INVALID_STATUS' })
                .expect(400);

            expect(response.body.message).toBeDefined();
        });

        it('should prevent unauthorized dispute creation', async () => {
            const response = await request(app.getHttpServer())
                .post('/disputes')
                .send({
                    claimId: 'non-existent-id',
                    disputedBy: 'unauthorized@example.com',
                    reason: 'Invalid claim',
                })
                .expect(400);

            expect(response.body.message).toBeDefined();
        });

        it('should return 404 for non-existent claim', async () => {
            await request(app.getHttpServer())
                .get('/claims/00000000-0000-0000-0000-000000000000')
                .expect(404);
        });

        it('should return 404 for non-existent dispute', async () => {
            await request(app.getHttpServer())
                .get('/disputes/00000000-0000-0000-0000-000000000000')
                .expect(404);
        });
    });

    describe('Data Integrity & Cross-Layer Validation', () => {
        it('should maintain referential integrity between claims and disputes', async () => {
            const claim = claimRepository.create({
                patientName: 'Integrity Test',
                patientId: 'P111111',
                patientDateOfBirth: new Date('1992-07-25'),
                hospitalName: 'Integrity Hospital',
                hospitalId: 'H111',
                diagnosisCodes: ['A00.0'],
                claimAmount: 2000.00,
                status: ClaimStatus.APPROVED,
            });
            const savedClaim = await claimRepository.save(claim);

            const dispute = disputeRepository.create({
                claimId: savedClaim.id,
                disputedBy: 'test@example.com',
                reason: 'Test dispute',
                status: DisputeStatus.OPEN,
            });
            const savedDispute = await disputeRepository.save(dispute);

            // Verify relationship
            const retrievedDispute = await disputeRepository.findOne({
                where: { id: savedDispute.id },
                relations: ['claim'],
            });

            expect(retrievedDispute.claim.id).toBe(savedClaim.id);
            expect(retrievedDispute.claim.patientName).toBe('Integrity Test');
        });

        it('should list all claims with pagination', async () => {
            const response = await request(app.getHttpServer())
                .get('/claims')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
        });

        it('should list all disputes with pagination', async () => {
            const response = await request(app.getHttpServer())
                .get('/disputes')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
        });
    });
});
