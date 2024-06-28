const { StatusCodes } = require("http-status-codes");
const asyncHandler = require("express-async-handler");

const Ledger = require("../models/ledgerModel");
const User = require("../models/userModel");
const { ErrorResponse } = require("../middleware/errorMiddleware");
const { createSchema, editSchema } = require("../util/ledgerValidationSchema");
const { PAGINATION_LIMIT } = require("../constants/policies");




const getLedgers = asyncHandler(async (req, res, next) => {
  const PAGE =
    parseInt(req.query.page, 10) > 0 ? parseInt(req.query.page, 10) : 0;

  const ledgers = await Ledger.find({ user_id: req.user.id })
    .sort("-created_at")
    .select(["-user_id", "-balance"])
    .skip(PAGE * PAGINATION_LIMIT)
    .limit(PAGINATION_LIMIT);


  const response = {
    skip: PAGE * PAGINATION_LIMIT,
    limit: PAGINATION_LIMIT,
    total: await Ledger.find({ user_id: req.user.id }).count(),
    ledgers,
  };

  res.status(StatusCodes.OK).json(response);
});



const getAllLedgers = asyncHandler(async (req, res, next) => {
  const ledgers = await Ledger.find({ user_id: req.user.id })
    .sort("-created_at")
    .select(["-user_id", "-balance"]);

  const response = {
    ledgers,
  };

  res.status(StatusCodes.OK).json(response);
});



const getLedger = asyncHandler(async (req, res, next) => {

  const { id } = req.params;

  let ledger;

  try {
    ledger = await Ledger.findOne({ _id: id, user_id: req.user.id }).select([
      "-user_id",
      "-balance",
    ]);
  } catch (error) {
    // for invalid mongodb objectId
    throw new ErrorResponse("Ledger not found", StatusCodes.NOT_FOUND);
  }


  if (!ledger) {
    throw new ErrorResponse("Ledger not found", StatusCodes.NOT_FOUND);
  }

  res.status(StatusCodes.OK).json(ledger);
});




const createLedger = asyncHandler(async (req, res, next) => {
  const { error } = createSchema.validate(req.body);

  if (error) {
    throw new ErrorResponse("Invalid input error", StatusCodes.BAD_REQUEST);
  }

  const stockist = await User.findOne({_id: req.body.stockist});

  if(!stockist){
    throw new ErrorResponse("Stockist Not Found", StatusCodes.NOT_FOUND);
  }

  const l = await Ledger.create({
    ...req.body,
    user_id: req.user.id,
  });

  // add ledger to stockist (user) model
  stockist.ledgers.push(l);

  await stockist.save();

  const ledger = await Ledger.findById(l.id).select(["-user_id", "-balance"]);

  res.status(StatusCodes.CREATED).json(ledger);
});






const editLedger = asyncHandler(async (req, res, next) => {
  const { error } = editSchema.validate(req.body);

  if (error) {
    throw new ErrorResponse("Invalid input error", StatusCodes.BAD_REQUEST);
  }

  const { id } = req.params;

  let ledger;

  try {
    ledger = await Ledger.findOne({ _id: id, user_id: req.user.id }).select([
      "-user_id",
      "-balance",
    ]);
  } catch (error) {
    // for invalid mongodb objectId
    throw new ErrorResponse("Ledger not found", StatusCodes.NOT_FOUND);
  }

  if (!ledger) {
    throw new ErrorResponse("Ledger not found", StatusCodes.NOT_FOUND);
  }

  const { name, type, description } = req.body;

  ledger.name = name;
  ledger.type = type;
  ledger.description = description;

  ledger.save();

  res.status(StatusCodes.OK).json(ledger);
});





module.exports = {
  createLedger,
  getLedgers,
  getAllLedgers,
  getLedger,
  editLedger,
};
