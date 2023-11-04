const Joi = require("@hapi/joi");

const registerSchema = Joi.object({
  username: Joi.string().min(6).required(),
  email: Joi.string().min(6).required().email(),
  password: Joi.string().min(6).required(),
  fullname: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  username: Joi.string().min(6).required(),
  password: Joi.string().min(6).required(),
});

const updateInfoSchema = Joi.object({
  username: Joi.string().min(6),
  email: Joi.string().min(6).email(),
  password: Joi.string().min(6),
  fullname: Joi.string().min(6),
});

const registerValidation = async (req, res, next) => {
  try {
    registerSchema.validate(req.body);
    next();
  } catch (err) {
    res.status(400).json({ success: false, message: error.details[0].message });
  }
};

//LOGIN VALIDATION
const loginValidation = async (req, res, next) => {
  try {
    loginSchema.validate(req.body);
    next();
  } catch (err) {
    res.status(400).json({ success: false, message: err.details[0].message });
  }
};

//UPDATE INFO SCHEMA
const updateInfoValidation = async (req, res, next) => {
  const { error } = updateInfoSchema.validate(req.body);

  if (error)
    return res
      .status(400)
      .json({ success: false, message: error.details[0].message });

  next();
};

module.exports = {
  registerValidation,
  loginValidation,
  updateInfoValidation,
};
