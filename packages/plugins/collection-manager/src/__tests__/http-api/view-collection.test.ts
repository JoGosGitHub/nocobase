import { MockServer } from '@nocobase/test';
import { createApp } from '../index';
import { uid } from '@nocobase/utils';
import { Database, Repository } from '@nocobase/database';

describe('view collection', () => {
  let app: MockServer;
  let db: Database;
  let agent;
  let testViewName;
  let collectionRepository: Repository;

  let fieldsRepository: Repository;

  beforeEach(async () => {
    app = await createApp({
      database: {
        tablePrefix: '',
      },
    });

    db = app.db;

    collectionRepository = app.db.getCollection('collections').repository;
    fieldsRepository = app.db.getCollection('fields').repository;

    agent = app.agent();
    testViewName = `view_${uid(6)}`;
    const dropSQL = `DROP VIEW IF EXISTS ${testViewName}`;
    await app.db.sequelize.query(dropSQL);
    const viewSQL = (() => {
      if (app.db.inDialect('sqlite')) {
        return `CREATE VIEW ${testViewName} AS WITH RECURSIVE numbers(n) AS (
  SELECT CAST(1 AS INTEGER)
  UNION ALL
  SELECT CAST(1 + n AS INTEGER) FROM numbers WHERE n < 20
)
SELECT * FROM numbers;
`;
      }

      return `CREATE VIEW ${testViewName} AS WITH RECURSIVE numbers(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM numbers WHERE n < 20
)
SELECT * FROM numbers;
`;
    })();
    await app.db.sequelize.query(viewSQL);
  });

  afterEach(async () => {
    await app.destroy();
  });

  it('should list views', async () => {
    const response = await agent.resource('dbViews').list();
    expect(response.status).toBe(200);
    expect(response.body.data.find((item) => item.name === testViewName)).toBeTruthy();

    await app.db.getCollection('collections').repository.create({
      values: {
        name: testViewName,
        view: true,
        schema: app.db.inDialect('postgres') ? 'public' : undefined,
        fields: [
          {
            name: 'numbers',
            type: 'integer',
          },
        ],
      },
      context: {},
    });

    const response2 = await agent.resource('dbViews').list();
    expect(response2.status).toBe(200);
    expect(response2.body.data.find((item) => item.name === testViewName)).toBeFalsy();
  });

  it('should query views data', async () => {
    const response = await agent.resource('dbViews').query({
      filterByTk: testViewName,
      pageSize: 20,
    });

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(20);
  });

  it('should list views fields', async () => {
    const response = await agent.resource('dbViews').get({
      filterByTk: testViewName,
      schema: 'public',
    });

    expect(response.status).toBe(200);
    const data = response.body.data;

    if (app.db.options.dialect === 'mysql') {
      expect(data.fields.n.type).toBe('bigInt');
    } else if (app.db.options.dialect == 'postgres') {
      expect(data.fields.n.type).toBe('integer');
    }

    console.log(
      JSON.stringify(
        {
          nField: data.fields.n,
        },
        null,
        2,
      ),
    );
  });

  it('should return possible types for json fields', async () => {
    const jsonViewName = 'json_view';
    const dropSql = `DROP VIEW IF EXISTS ${jsonViewName}`;
    await app.db.sequelize.query(dropSql);

    const jsonViewSQL = (() => {
      if (app.db.inDialect('postgres')) {
        return `CREATE VIEW ${jsonViewName} AS SELECT '{"a": 1}'::json as json_field`;
      }
      return `CREATE VIEW ${jsonViewName} AS SELECT JSON_OBJECT('key1', 1, 'key2', 'abc') as json_field`;
    })();

    await app.db.sequelize.query(jsonViewSQL);

    const response = await agent.resource('dbViews').get({
      filterByTk: jsonViewName,
      schema: app.db.inDialect('postgres') ? 'public' : undefined,
    });

    expect(response.status).toBe(200);
    const data = response.body.data;
    if (!app.db.inDialect('sqlite')) {
      expect(data.fields.json_field.type).toBe('json');
    }
    expect(data.fields.json_field.possibleTypes).toBeTruthy();
  });

  it('should not throw error when source collection destroyed', async () => {
    await app.db.getCollection('collections').repository.create({
      values: {
        name: 'users',
        fields: [
          {
            name: 'name',
            type: 'string',
            interface: 'text',
            uiSchema: 'name-uiSchema',
          },
          {
            name: 'age',
            type: 'integer',
            interface: 'number',
            uiSchema: 'age-uiSchema',
          },
        ],
      },
      context: {},
    });

    await app.db.sync();
    const UserCollection = app.db.getCollection('users');

    const viewName = `t_${uid(6)}`;
    const dropSQL = `DROP VIEW IF EXISTS ${viewName}`;
    await app.db.sequelize.query(dropSQL);
    const viewSQL = `CREATE VIEW ${viewName} AS SELECT * FROM ${UserCollection.quotedTableName()}`;
    await app.db.sequelize.query(viewSQL);

    // create view collection
    const viewCollection = await app.db.getCollection('collections').repository.create({
      values: {
        name: viewName,
        view: true,
        schema: app.db.inDialect('postgres') ? 'public' : undefined,
        fields: [
          {
            name: 'name',
            type: 'string',
            source: 'users.name',
          },
          {
            name: 'age',
            type: 'integer',
            source: 'users.age',
          },
        ],
      },
      context: {},
    });

    const response = await agent.resource('collections').list({
      appends: ['fields'],
      paginate: false,
    });

    expect(response.status).toBe(200);

    // drop view first
    await app.db.sequelize.query(dropSQL);

    // remove source collection
    await app.db.getCollection('collections').repository.destroy({
      filterByTk: 'users',
      context: {},
    });

    const response2 = await agent.resource('collections').list({
      appends: ['fields'],
      paginate: false,
    });

    expect(response2.statusCode).toBe(200);
  });

  it('should list collections fields with source interface', async () => {
    await app.db.getCollection('collections').repository.create({
      values: {
        name: 'users',
        fields: [
          {
            name: 'name',
            type: 'string',
            interface: 'text',
            uiSchema: 'name-uiSchema',
          },
          {
            name: 'age',
            type: 'integer',
            interface: 'number',
            uiSchema: 'age-uiSchema',
          },
        ],
      },
      context: {},
    });

    await app.db.sync();
    const UserCollection = app.db.getCollection('users');

    const viewName = `t_${uid(6)}`;
    const dropSQL = `DROP VIEW IF EXISTS ${viewName}`;
    await app.db.sequelize.query(dropSQL);
    const viewSQL = `CREATE VIEW ${viewName} AS SELECT * FROM ${UserCollection.quotedTableName()}`;
    await app.db.sequelize.query(viewSQL);

    // create view collection
    const viewCollection = await app.db.getCollection('collections').repository.create({
      values: {
        name: viewName,
        view: true,
        schema: app.db.inDialect('postgres') ? 'public' : undefined,
        fields: [
          {
            name: 'name',
            type: 'string',
            source: 'users.name',
          },
          {
            name: 'age',
            type: 'integer',
            source: 'users.age',
          },
        ],
      },
      context: {},
    });

    const response = await agent.resource('collections').list({
      appends: ['fields'],
      paginate: false,
    });

    const listResult = response.body.data.find((item) => item.name === viewName);

    const fields = listResult.fields;

    const nameField = fields.find((item) => item.name === 'name');
    expect(nameField.interface).toBe('text');
    expect(nameField.uiSchema).toBe('name-uiSchema');

    const viewFieldsResponse = await agent.resource('collections.fields', viewName).list({
      filter: {
        $or: {
          'interface.$not': null,
          'options.source.$notEmpty': true,
        },
      },
    });

    expect(viewFieldsResponse.status).toEqual(200);
    const viewFieldsData = viewFieldsResponse.body.data;
    expect(viewFieldsData.length).toEqual(2);

    expect(viewFieldsData.find((item) => item.name === 'name').interface).toEqual('text');

    const fieldDetailResponse = await agent.resource('collections.fields', viewName).get({
      filterByTk: 'name',
    });

    const fieldDetailData = fieldDetailResponse.body.data;
    expect(fieldDetailData.interface).toEqual('text');

    UserCollection.addField('email', { type: 'string' });

    await app.db.sync();

    // update view in database
    await app.db.sequelize.query(dropSQL);
    const viewSQL2 = `CREATE VIEW ${viewName} AS SELECT * FROM ${UserCollection.quotedTableName()}`;
    await app.db.sequelize.query(viewSQL2);

    const viewDetailResponse = await agent.resource('dbViews').get({
      filterByTk: viewName,
      schema: 'public',
    });

    const viewDetail = viewDetailResponse.body.data;
    const viewFields = viewDetail.fields;

    const updateFieldsResponse = await agent.resource('collections').setFields({
      filterByTk: viewName,
      values: {
        fields: Object.values(viewFields),
      },
    });

    expect(updateFieldsResponse.status).toEqual(200);

    const viewCollectionWithEmail = app.db.getCollection(viewName);
    expect(viewCollectionWithEmail.getField('email')).toBeTruthy();
  });

  it('should access view collection resource', async () => {
    const UserCollection = app.db.collection({
      name: 'users',
      fields: [
        {
          name: 'name',
          type: 'string',
        },
      ],
    });

    await app.db.sync();

    await UserCollection.repository.create({
      values: {
        name: 'John',
      },
    });

    // create view
    const viewName = `t_${uid(6)}`;
    const dropSQL = `DROP VIEW IF EXISTS ${viewName}`;
    await app.db.sequelize.query(dropSQL);
    const viewSQL = `CREATE VIEW ${viewName} AS SELECT * FROM ${UserCollection.quotedTableName()}`;
    await app.db.sequelize.query(viewSQL);

    // create view collection
    await app.db.getCollection('collections').repository.create({
      values: {
        name: viewName,
        view: true,
        schema: app.db.inDialect('postgres') ? 'public' : undefined,
        fields: [
          {
            name: 'id',
            type: 'integer',
          },
          {
            name: 'name',
            type: 'string',
          },
        ],
      },
      context: {},
    });

    const viewCollection = app.db.getCollection(viewName);

    // access view collection list
    const listResponse = await agent.resource(viewCollection.name).list({});
    expect(listResponse.status).toEqual(200);

    const item = listResponse.body.data[0];

    // access detail
    const detailResponse = await agent.resource(viewCollection.name).get({
      filterByTk: item['id'],
    });

    expect(detailResponse.status).toEqual(200);
  });

  it('should get view in difference schema', async () => {
    if (!app.db.inDialect('postgres')) return;

    const schemaName = `t_${uid(6)}`;
    const testSchemaSql = `CREATE SCHEMA IF NOT EXISTS ${schemaName};`;
    await app.db.sequelize.query(testSchemaSql);

    const viewName = `v_${uid(6)}`;

    const viewSQL = `CREATE OR REPLACE VIEW ${schemaName}.${viewName} AS SELECT 1+1 as result`;
    await app.db.sequelize.query(viewSQL);

    const response = await agent.resource('dbViews').query({
      filterByTk: viewName,
      schema: schemaName,
      pageSize: 20,
    });

    expect(response.status).toEqual(200);
  });

  it('should edit uiSchema in view collection field', async () => {
    await app.db.getCollection('collections').repository.create({
      values: {
        name: 'users',
        fields: [
          {
            name: 'name',
            type: 'string',
            uiSchema: {
              title: 'hello',
            },
          },
        ],
      },
      context: {},
    });

    await app.db.sync();

    const UserCollection = app.db.getCollection('users');

    // create view
    const viewName = `t_${uid(6)}`;
    const dropSQL = `DROP VIEW IF EXISTS ${viewName}`;
    await app.db.sequelize.query(dropSQL);
    const viewSQL = `CREATE VIEW ${viewName} AS SELECT * FROM ${UserCollection.quotedTableName()}`;
    await app.db.sequelize.query(viewSQL);

    // create view collection
    await app.db.getCollection('collections').repository.create({
      values: {
        name: viewName,
        view: true,
        schema: 'public',
        fields: [
          {
            name: 'id',
            type: 'integer',
          },
          {
            name: 'name',
            type: 'string',
            source: 'users.name',
          },
        ],
      },
      context: {},
    });

    await app.db.getCollection('fields').repository.update({
      filter: {
        name: 'name',
        collectionName: viewName,
      },

      values: {
        uiSchema: {
          title: 'bars',
        },
      },
      context: {},
    });

    const viewCollection = app.db.getCollection(viewName);

    expect(viewCollection.getField('name').options.uiSchema.title).toEqual('bars');

    const viewFieldsResponse = await agent.resource('collections.fields', viewName).list({});
    const nameField = viewFieldsResponse.body.data.find((item) => item.name === 'name');
    expect(nameField.uiSchema.title).toEqual('bars');
  });

  it('should create view collection with belongs to field', async () => {
    // not support sqlite
    if (db.inDialect('sqlite')) {
      return;
    }
    await collectionRepository.create({
      values: {
        name: 'groups',
        fields: [{ name: 'name', type: 'string' }],
      },
      context: {},
    });

    await collectionRepository.create({
      values: {
        name: 'users',
        fields: [
          { name: 'name', type: 'string' },
          { type: 'belongsTo', name: 'group', foreignKey: 'groupId', interface: 'test-interface' },
        ],
      },
      context: {},
    });

    const User = db.getCollection('users');

    const assoc = User.model.associations.group;
    const foreignKey = assoc.foreignKey;
    const foreignField = User.model.rawAttributes[foreignKey].field;

    const viewName = `test_view_${uid(6)}`;
    await db.sequelize.query(`DROP VIEW IF EXISTS ${viewName}`);
    const queryInterface = db.sequelize.getQueryInterface();

    const createSQL = `CREATE VIEW ${queryInterface.quoteIdentifier(
      viewName,
    )} AS SELECT id, ${queryInterface.quoteIdentifier(foreignField)}, name FROM ${db
      .getCollection('users')
      .quotedTableName()}`;

    await db.sequelize.query(createSQL);

    const response = await agent.resource('dbViews').get({
      filterByTk: viewName,
      schema: db.inDialect('postgres') ? 'public' : undefined,
      pageSize: 20,
    });

    expect(response.status).toEqual(200);
    const fields = response.body.data.fields;

    await collectionRepository.create({
      values: {
        name: viewName,
        view: true,
        fields: Object.values(fields),
        schema: db.inDialect('postgres') ? 'public' : undefined,
      },
      context: {},
    });

    const viewFieldsResponse = await agent.resource('collections.fields', viewName).list({});
    expect(viewFieldsResponse.status).toEqual(200);
    const viewFields = viewFieldsResponse.body.data;
    const groupField = viewFields.find((item) => item.name === 'group');

    expect(groupField.type).toEqual('belongsTo');
    expect(groupField.interface).toEqual('test-interface');

    const listResponse1 = await agent.resource(viewName).list({
      appends: ['group'],
    });

    expect(listResponse1.status).toEqual(200);
  });
});
