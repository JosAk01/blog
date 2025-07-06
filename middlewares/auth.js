const express = require('express');


function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.status(401).send('You need to log in first.');
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    const userRole = req.session.user?.role;
    if (userRole && allowedRoles.includes(userRole)) {
      return next();
    }
    return res.status(403).send('Access Denied');
  };
}

module.exports = { isAuthenticated, authorize };