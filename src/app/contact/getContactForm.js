const getContactForm = async (req, res) => {
  req.session = null;

  res.render('contact/views/contactForm', {
    csrfToken: req.csrfToken(),
    name: '',
    email: '',
    saUsername: '',
    orgName: '',
    urn: '',
    phone: '',
    service: '',
    type: '',
    message: '',
    validationMessages: {},
    isHidden: true,
    backLink: true,
  });
};

module.exports = getContactForm;
