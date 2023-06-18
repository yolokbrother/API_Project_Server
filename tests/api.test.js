const request = require('supertest');
const app = require('../server'); // Import your Express app

describe('POST /register', () => {
  it('should successfully register a new public user', async () => {
    const userData = {
      email: 'test@gmail.com',
      password: 'test1234',
      signUpCode: 'default',
    };

    const res = await request(app).post('/api/register').send(userData);
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('User created successfully');
  });

  it('should return an error for invalid email', async () => {
    const userData = {
      email: ' ',
      password: 'test1234',
      signUpCode: 'valid-sign-up-code',
    };

    const res = await request(app).post('/api/register').send(userData);
    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('Error creating user');
  });

  describe('POST /login', () => {
    it('should successfully fetch user details by email', async () => {
      const userData = {
        email: 'test@gmail.com',
        password: 'test1234', // This will not be used in your current login route
      };
  
      const res = await request(app).post('/api/login').send(userData);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toEqual(userData.email);
    });
  
    it('should return an error for a non-existing email', async () => {
      const userData = {
        email: 'nonexistent@gmail.com',
        password: 'test1234', // This will not be used in your current login route
      };
  
      const res = await request(app).post('/api/login').send(userData);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('Error finding user');
    });
  
    describe('GET /AllCats', () => {
        it('should successfully fetch all cat data', async () => {
          const res = await request(app).get('/api/AllCats');
          expect(res.statusCode).toEqual(200);
          expect(Array.isArray(res.body)).toBeTruthy();
          
        });
      });
  });
});