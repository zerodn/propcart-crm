import { Test, TestingModule } from '@nestjs/testing';
import { DepartmentService } from './department.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RoleService } from '../role/role.service';
import { ElasticsearchService } from '../../elasticsearch/elasticsearch.service';

describe('DepartmentService', () => {
  let service: DepartmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentService,
        {
          provide: PrismaService,
          useValue: {
            department: {
              create: jest.fn(),
              findMany: jest.fn(),
            },
            workspaceMember: {
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: RoleService,
          useValue: {
            listWorkspaceRoles: jest.fn(),
          },
        },
        {
          provide: ElasticsearchService,
          useValue: {
            indexMember: jest.fn(),
            searchMembers: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DepartmentService>(DepartmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
