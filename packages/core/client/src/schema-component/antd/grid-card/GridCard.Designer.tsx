import { ArrayItems } from '@formily/antd';
import { ISchema, useField, useFieldSchema } from '@formily/react';
import { Slider } from 'antd';
import _ from 'lodash';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCollection, useCollectionFilterOptions, useSortFields } from '../../../collection-manager';
import { GeneralSchemaDesigner, SchemaSettings } from '../../../schema-settings';
import { useSchemaTemplate } from '../../../schema-templates';
import { SchemaComponentOptions } from '../../core';
import { useDesignable } from '../../hooks';
import { removeNullCondition } from '../filter';
import { FilterDynamicComponent } from '../table-v2/FilterDynamicComponent';
import { defaultColumnCount, gridSizes, pageSizeOptions, screenSizeMaps, screenSizeTitleMaps } from './options';

const columnCountMarks = [1, 2, 3, 4, 6, 8, 12, 24].reduce((obj, cur) => {
  obj[cur] = cur;
  return obj;
}, {});

export const GridCardDesigner = () => {
  const { name, title } = useCollection();
  const template = useSchemaTemplate();
  const { t } = useTranslation();
  const fieldSchema = useFieldSchema();
  const field = useField();
  const dataSource = useCollectionFilterOptions(name);
  const { dn } = useDesignable();
  const sortFields = useSortFields(name);
  const defaultFilter = fieldSchema?.['x-decorator-props']?.params?.filter || {};
  const defaultSort = fieldSchema?.['x-decorator-props']?.params?.sort || [];
  const defaultResource = fieldSchema?.['x-decorator-props']?.resource;
  const columnCount = field.decoratorProps.columnCount || defaultColumnCount;

  const columnCountSchema = useMemo(() => {
    return {
      'x-component': 'Slider',
      'x-decorator': 'FormItem',
      'x-component-props': {
        min: 1,
        max: 24,
        marks: columnCountMarks,
        tooltip: {
          formatter: (value) => `${value}${t('Column')}`,
        },
        step: null,
      },
    };
  }, [t]);

  const columnCountProperties = useMemo(() => {
    return gridSizes.reduce((o, k) => {
      o[k] = {
        ...columnCountSchema,
        title: t(screenSizeTitleMaps[k]),
        description: `${t('Screen size')} ${screenSizeMaps[k]} ${t('pixels')}`,
      };
      return o;
    }, {});
  }, [columnCountSchema, t]);

  const sort = defaultSort?.map((item: string) => {
    return item.startsWith('-')
      ? {
          field: item.substring(1),
          direction: 'desc',
        }
      : {
          field: item,
          direction: 'asc',
        };
  });
  return (
    <GeneralSchemaDesigner template={template} title={title || name}>
      <SchemaComponentOptions components={{ Slider }}>
        <SchemaSettings.ModalItem
          title={t('Set the count of columns displayed in a row')}
          initialValues={columnCount}
          schema={
            {
              type: 'object',
              title: t('Set the count of columns displayed in a row'),
              properties: columnCountProperties,
            } as ISchema
          }
          onSubmit={(columnCount) => {
            _.set(fieldSchema, 'x-decorator-props.columnCount', columnCount);
            field.decoratorProps.columnCount = columnCount;
            dn.emit('patch', {
              schema: {
                ['x-uid']: fieldSchema['x-uid'],
                'x-decorator-props': fieldSchema['x-decorator-props'],
              },
            });
          }}
        />
        <SchemaSettings.ModalItem
          title={t('Set the data scope')}
          schema={
            {
              type: 'object',
              title: t('Set the data scope'),
              properties: {
                filter: {
                  default: defaultFilter,
                  // title: '数据范围',
                  enum: dataSource,
                  'x-component': 'Filter',
                  'x-component-props': {
                    dynamicComponent: (props) => FilterDynamicComponent({ ...props }),
                  },
                },
              },
            } as ISchema
          }
          onSubmit={({ filter }) => {
            filter = removeNullCondition(filter);
            _.set(fieldSchema, 'x-decorator-props.params.filter', filter);
            field.decoratorProps.params = { ...fieldSchema['x-decorator-props'].params };
            dn.emit('patch', {
              schema: {
                ['x-uid']: fieldSchema['x-uid'],
                'x-decorator-props': fieldSchema['x-decorator-props'],
              },
            });
          }}
        />
        <SchemaSettings.ModalItem
          title={t('Set default sorting rules')}
          components={{ ArrayItems }}
          schema={
            {
              type: 'object',
              title: t('Set default sorting rules'),
              properties: {
                sort: {
                  type: 'array',
                  default: sort,
                  'x-component': 'ArrayItems',
                  'x-decorator': 'FormItem',
                  items: {
                    type: 'object',
                    properties: {
                      space: {
                        type: 'void',
                        'x-component': 'Space',
                        properties: {
                          sort: {
                            type: 'void',
                            'x-decorator': 'FormItem',
                            'x-component': 'ArrayItems.SortHandle',
                          },
                          field: {
                            type: 'string',
                            enum: sortFields,
                            required: true,
                            'x-decorator': 'FormItem',
                            'x-component': 'Select',
                            'x-component-props': {
                              style: {
                                width: 260,
                              },
                            },
                          },
                          direction: {
                            type: 'string',
                            'x-decorator': 'FormItem',
                            'x-component': 'Radio.Group',
                            'x-component-props': {
                              optionType: 'button',
                            },
                            enum: [
                              {
                                label: t('ASC'),
                                value: 'asc',
                              },
                              {
                                label: t('DESC'),
                                value: 'desc',
                              },
                            ],
                          },
                          remove: {
                            type: 'void',
                            'x-decorator': 'FormItem',
                            'x-component': 'ArrayItems.Remove',
                          },
                        },
                      },
                    },
                  },
                  properties: {
                    add: {
                      type: 'void',
                      title: t('Add sort field'),
                      'x-component': 'ArrayItems.Addition',
                    },
                  },
                },
              },
            } as ISchema
          }
          onSubmit={({ sort }) => {
            const sortArr = sort.map((item) => {
              return item.direction === 'desc' ? `-${item.field}` : item.field;
            });

            _.set(fieldSchema, 'x-decorator-props.params.sort', sortArr);
            field.decoratorProps.params = { ...fieldSchema['x-decorator-props'].params };
            dn.emit('patch', {
              schema: {
                ['x-uid']: fieldSchema['x-uid'],
                'x-decorator-props': fieldSchema['x-decorator-props'],
              },
            });
          }}
        />
        <SchemaSettings.SelectItem
          title={t('Records per page')}
          value={field.decoratorProps?.params?.pageSize || 20}
          options={pageSizeOptions.map((v) => ({ value: v }))}
          onChange={(pageSize) => {
            _.set(fieldSchema, 'x-decorator-props.params.pageSize', pageSize);
            field.decoratorProps.params = { ...fieldSchema['x-decorator-props'].params, page: 1 };
            dn.emit('patch', {
              schema: {
                ['x-uid']: fieldSchema['x-uid'],
                'x-decorator-props': fieldSchema['x-decorator-props'],
              },
            });
          }}
        />
        <SchemaSettings.Template componentName={'GridCard'} collectionName={name} resourceName={defaultResource} />
        <SchemaSettings.Divider />
        <SchemaSettings.Remove
          removeParentsIfNoChildren
          breakRemoveOn={{
            'x-component': 'Grid',
          }}
        />
      </SchemaComponentOptions>
    </GeneralSchemaDesigner>
  );
};
