import { handler } from './lambda.js';
const result = await handler({ httpMethod: 'GET', path: '/health' }); console.log(JSON.stringify(result, null, 2));
