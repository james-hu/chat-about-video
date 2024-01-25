import { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  preset: 'ts-jest',
  testEnvironment: 'node',
};

// eslint-disable-next-line unicorn/prefer-module
module.exports = config;
