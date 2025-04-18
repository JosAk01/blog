const express = require('express');


function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.status(401).send('You need to log in first.');
}

function authorize(...roles) {
  return (req, res, next) => {
    if (roles.includes(req.session.user.role)) {
      return next();
    }
    res.status(403).send('You do not have permission to access this resource.');
  };
}

module.exports = { isAuthenticated, authorize };