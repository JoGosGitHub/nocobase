import React from 'react';
import { render, screen, sleep, userEvent } from 'testUtils';
import App1 from '../demos/demo1';
import App2 from '../demos/demo2';
import App3 from '../demos/demo3';
import App4 from '../demos/demo4';
import App5 from '../demos/demo5';
import App6 from '../demos/demo6';
import App7 from '../demos/demo7';
import App8 from '../demos/demo8';

describe('Form', () => {
  it('basic', async () => {
    render(<App2 />);

    const submit = screen.getByText('Submit');
    const input = document.querySelector('.ant-input') as HTMLInputElement;

    expect(submit).toBeInTheDocument();
    expect(input).toBeInTheDocument();
    expect(screen.getByText(/form title/i)).toBeInTheDocument();
    expect(screen.getByText('T1')).toBeInTheDocument();
    expect(screen.getByText(/\{\}/i)).toBeInTheDocument();

    await userEvent.type(input, '123');
    expect(screen.getByText(/\{ "field1": "123" \}/i)).toBeInTheDocument();
  });

  it('decorator', async () => {
    render(<App6 />);

    // 等待默认值渲染
    await sleep();

    const submit = screen.getByText('Submit');
    const input = document.querySelector('.ant-input') as HTMLInputElement;

    expect(submit).toBeInTheDocument();
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('aaa');
    expect(screen.getByText('T1')).toBeInTheDocument();
    expect(screen.getByText(/\{ "field1": "aaa" \}/i)).toBeInTheDocument();

    await userEvent.type(input, '123');
    expect(screen.getByText(/\{ "field1": "aaa123" \}/i)).toBeInTheDocument();
  });

  it('Form & Drawer', async () => {
    render(<App1 />);

    const openBtn = screen.getByText('Open');
    await userEvent.click(openBtn);
    expect(screen.getByText(/drawer title/i)).toBeInTheDocument();
  });

  it('initialValue', async () => {
    render(<App3 />);

    // 等待默认值渲染
    await sleep();

    const submit = screen.getByText('Submit');
    const input = document.querySelector('.ant-input') as HTMLInputElement;

    expect(submit).toBeInTheDocument();
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('aaa');
    expect(screen.getByText(/\{ "field1": "aaa" \}/i)).toBeInTheDocument();
  });

  it('initialValue of decorator', async () => {
    render(<App4 />);

    const openBtn = screen.getByText('Open');
    await userEvent.click(openBtn);

    const input = document.querySelector('.ant-input') as HTMLInputElement;

    expect(screen.getByText(/drawer title/i)).toBeInTheDocument();
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('aaa');
    expect(screen.getByText(/\{ "field1": "aaa" \}/i)).toBeInTheDocument();
  });

  it('remote data', async () => {
    render(<App5 />);

    const loading = document.querySelector('.ant-spin');
    const t1Input = document.querySelector('.t1 .ant-input') as HTMLInputElement;
    const t2Input = document.querySelector('.t2 .ant-input') as HTMLInputElement;
    const submit = screen.getByText('Submit');
    const refresh = screen.getByText('Refresh');

    expect(submit).toBeInTheDocument();
    expect(refresh).toBeInTheDocument();
    expect(t1Input).toBeInTheDocument();
    expect(t1Input).toHaveValue('');
    expect(t2Input).toBeInTheDocument();
    expect(t2Input).toHaveValue('default value');
    expect(screen.getByText(/\{ "field2": "default value" \}/i)).toBeInTheDocument();

    // 加载数据期间，显示 loading
    expect(loading).toBeInTheDocument();

    // 等待数据加载
    await sleep(600);
    expect(t1Input).toHaveValue('uid');
    expect(screen.getByText(/\{ "field2": "default value", "field1": "uid" \}/i)).toBeInTheDocument();
  });

  it('useValues', async () => {
    render(<App7 />);

    // 等待 useRequest 返回值
    await sleep();

    const submit = screen.getByText('Submit');
    const input = document.querySelector('.ant-input') as HTMLInputElement;

    expect(submit).toBeInTheDocument();
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('aabb');
    expect(screen.getByText(/\{ "field1": "aabb" \}/i)).toBeInTheDocument();
  });

  it('DrawerForm & async data', async () => {
    render(<App8 />);

    const editBtn = screen.getByText('Edit');
    await userEvent.click(editBtn);

    const input = document.querySelector('.ant-input') as HTMLInputElement;
    const closeBtn = screen.getByText('Close');

    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('hello nocobase');
    expect(closeBtn).toBeInTheDocument();
    expect(screen.getByText(/drawer title/i)).toBeInTheDocument();
  });
});
