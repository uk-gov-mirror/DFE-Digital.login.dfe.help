jest.mock('./../../../src/infrastructure/config', () => {
  return {
    notifications: {
      connectionString: 'redis://localhost:6379?db=99',
    },
  };
});
jest.mock('login.dfe.notifications.client');

const NotificationClient = require('login.dfe.notifications.client');
const sendSupportRequest = jest.fn();
NotificationClient.mockImplementation(() => {
  return {
    sendSupportRequest,
  };
});


describe('When handling postback of contact form', () => {
  let req;
  let res;
  let postContactForm;

  beforeEach(() => {
    req = {
      body: {
        name: 'User One',
        email: 'user.one@unit.test',
        phone: '01234 567890',
        message: 'Please help me',
      },
    };

    res = {
      redirect: jest.fn(),
      render: jest.fn(),
    };

    sendSupportRequest.mockReset();
    NotificationClient.mockImplementation(() => {
      return {
        sendSupportRequest,
      };
    });

    NotificationClient.mockReset();
    NotificationClient.mockImplementation(() => {
      return {
        sendSupportRequest,
      };
    });

    postContactForm = require('./../../../src/app/contact/postContactForm');
  });

  it('then it should create NotificationClient with config connection string', async () => {
    await postContactForm(req, res);

    expect(NotificationClient.mock.calls).toHaveLength(1);
    expect(NotificationClient.mock.calls[0][0]).toEqual({
      connectionString: 'redis://localhost:6379?db=99',
    });
  });

  it('then it should send support request job with form details', async () => {
    await postContactForm(req, res);

    expect(sendSupportRequest.mock.calls).toHaveLength(1);
    expect(sendSupportRequest.mock.calls[0][0]).toBe(req.body.name);
    expect(sendSupportRequest.mock.calls[0][1]).toBe(req.body.email);
    expect(sendSupportRequest.mock.calls[0][2]).toBe(req.body.phone);
    expect(sendSupportRequest.mock.calls[0][3]).toBe(req.body.message);
  })
});