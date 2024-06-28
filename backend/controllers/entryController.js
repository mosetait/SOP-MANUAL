const { StatusCodes } = require("http-status-codes");
const asyncHandler = require("express-async-handler");

const Entry = require("../models/entryModel");
const Ledger = require("../models/ledgerModel");
const { ErrorResponse } = require("../middleware/errorMiddleware");
const { createSchema, editSchema } = require("../util/entryValidationSchema");
const { PAGINATION_LIMIT } = require("../constants/policies"); // Removed ENTRY_LIMIT


const fs = require('fs');
const path = require('path');



const getEntries = asyncHandler(async (req, res, next) => {
  const PAGE =
    parseInt(req.query.page, 10) > 0 ? parseInt(req.query.page, 10) : 0;

  const entries = await Entry.find({ user_id: req.user.id })
    .sort("-created_at")
    .populate("debit_ledger", "-user_id -balance")
    .populate("credit_ledger", "-user_id -balance")
    .select(["-user_id"])
    .skip(PAGE * PAGINATION_LIMIT)
    .limit(PAGINATION_LIMIT);

  const response = {
    skip: PAGE * PAGINATION_LIMIT,
    limit: PAGINATION_LIMIT,
    total: await Entry.find({ user_id: req.user.id }).count(),
    entries,
  };

  res.status(StatusCodes.OK).json(response);
});

const getEntry = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  let entry;

  try {
    entry = await Entry.findOne({ _id: id, user_id: req.user.id })
      .populate("debit_ledger", "-user_id -balance")
      .populate("credit_ledger", "-user_id -balance")
      .select(["-user_id"]);
  } catch (error) {
    // for invalid mongodb objectId
    throw new ErrorResponse("Entry not found", StatusCodes.NOT_FOUND);
  }

  if (!entry) {
    throw new ErrorResponse("Entry not found", StatusCodes.NOT_FOUND);
  }

  res.status(StatusCodes.OK).json(entry);
});


const createEntry = asyncHandler(async (req, res, next) => {

  const { error } = createSchema.validate(req.body);
  


  if (!req.files || !req.files.attachment) {
    return res.status(401).json({
        success: false,
        message: "Please upload Balance Transfer proof."
    });
}

  const attachment = req.files.attachment;


  if (error) {
    throw new ErrorResponse("Invalid input error", StatusCodes.BAD_REQUEST);
  }

  // Removed the ENTRY_LIMIT check
  const { debit_ledger_id, credit_ledger_id, amount, narration } = req.body;

  const debit_ledger = await Ledger.findOne({
    user_id: req.user.id,
    _id: debit_ledger_id,
  });

  if (!debit_ledger) {
    throw new ErrorResponse("Invalid debit ledger", StatusCodes.BAD_REQUEST);
  }

  const credit_ledger = await Ledger.findOne({
    user_id: req.user.id,
    _id: credit_ledger_id,
  });

  if (!credit_ledger) {
    throw new ErrorResponse("Invalid credit ledger", StatusCodes.BAD_REQUEST);
  }

  if (debit_ledger.id === credit_ledger.id) {
    throw new ErrorResponse(
      "Debit and credit ledger cannot be the same",
      StatusCodes.BAD_REQUEST
    );
  }


    // Save the attachment to the server
    const fileName = `attachment_${Date.now()}_${attachment.name}`;
    const uploadPath = `uploads/${fileName}`;

    try {
        attachment.mv(uploadPath, (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    success: false,
                    message: "Error while saving file to server."
                });
            }
        });
    } catch (error) {
  
        return res.status(500).json({
            success: false,
            message: "Error while saving proof."
        });
    }

  const e = await Entry.create({
    ...req.body,
    debit_ledger: debit_ledger.id,
    credit_ledger: credit_ledger.id,
    user_id: req.user.id,
    attachment: {
      name: fileName,
      path: uploadPath
    }
  });





  const entry = await Entry.findById(e.id)
    .populate("debit_ledger", "-user_id -balance")
    .populate("credit_ledger", "-user_id -balance")
    .select(["-user_id"]);

  return res.status(StatusCodes.CREATED).json(entry);
});



const editEntry = asyncHandler(async (req, res, next) => {
  const { error } = editSchema.validate(req.body);

  if (error) {
    throw new ErrorResponse("Invalid input error", StatusCodes.BAD_REQUEST);
  }

  const { id } = req.params;

  let entry;

  try {
    entry = await Entry.findOne({ _id: id, user_id: req.user.id })
      .populate("debit_ledger", "-user_id -balance")
      .populate("credit_ledger", "-user_id -balance")
      .select(["-user_id"]);
  } catch (error) {
    // for invalid mongodb objectId
    throw new ErrorResponse("Entry not found", StatusCodes.NOT_FOUND);
  }

  if (!entry) {
    throw new ErrorResponse("Entry not found", StatusCodes.NOT_FOUND);
  }

  const { narration } = req.body;

  entry.narration = narration;

  entry.save();

  res.status(StatusCodes.OK).json(entry);
});



// const normalizeEntries = asyncHandler(async (req, res, next) => {
//   const ledgers = await Ledger.find({
//     user_id: req.user.id,
//   }).select(["-user_id"]);

//   // array of ledgers with normalized balances
//   const ledgerWithNormalizedBalanceArray = [];

//   /**
//    * ledgerIdList is an array of ledger ids
//    * In addition, the map function also populates the ledgerWithNormalizedBalanceArray
//    */
//   const ledgerIdList = ledgers.map((l) => {
//     if (l.balance !== 0) ledgerWithNormalizedBalanceArray.push(l);
//     return l._id;
//   });

//   // list of ledgers with the total of their debit side
//   const debitResult = await Entry.aggregate([
//     {
//       $match: {
//         debit_ledger: { $in: ledgerIdList },
//       },
//     },

//     {
//       $group: {
//         _id: "$debit_ledger",
//         total: { $sum: "$amount" },
//       },
//     },

//     {
//       $project: {
//         _id: 0,
//         ledger: "$_id",
//         total: 1,
//       },
//     },
//   ]).exec();

//   // list of ledgers with the total of their credit side
//   const creditResult = await Entry.aggregate([
//     {
//       $match: {
//         credit_ledger: { $in: ledgerIdList },
//       },
//     },

//     {
//       $group: {
//         _id: "$credit_ledger",
//         total: { $sum: "$amount" },
//       },
//     },

//     {
//       $project: {
//         _id: 0,
//         ledger: "$_id",
//         total: 1,
//       },
//     },
//   ]).exec();

//   // populating with other ledger values for the
//   await Ledger.populate(debitResult, {
//     path: "ledger",
//     select: "-user_id -balance",
//   });
//   await Ledger.populate(creditResult, {
//     path: "ledger",
//     select: "-user_id -balance",
//   });

//   // Now calculate the balances
//   const tb = {};

//   // debit side value
//   for (const el of debitResult) {
//     tb[el.ledger.id] = { ...el };
//   }

//   // credit side value
//   for (const el of creditResult) {
//     if (!tb[el.ledger.id]) {
//       tb[el.ledger.id] = { ...el };
//       tb[el.ledger.id].total = -el.total;
//     } else {
//       tb[el.ledger.id].total -= el.total;
//     }
//   }

//   // ledgers with normalized balances
//   for (const el of ledgerWithNormalizedBalanceArray) {
//     if (tb[el.id]) {
//       tb[el.id].total += el.balance;
//     } else {
//       const balance = el.balance;
//       delete el._doc.balance;

//       tb[el.id] = {
//         balance,
//         ledger: el,
//       };
//     }
//   }

//   // balances object
//   const trialBalance = [];

//   for (const el of Object.keys(tb)) {
//     const balance = tb[el].total;
//     delete tb[el].total;
//     trialBalance.push({ balance, ...tb[el] });
//   }

//   // bulk update ledger balance
//   const bulk = Ledger.collection.initializeOrderedBulkOp();
//   for (const i of trialBalance) {
//     bulk.find({ _id: i.ledger._id }).update({ $set: { balance: i.balance } });
//   }
//   const result = await bulk.execute();

//   // delete entries
//   await Entry.deleteMany({ user_id: req.user.id });

//   res.status(StatusCodes.OK).json({ success: true });
// });



// const normalizeEntry = asyncHandler(async (req, res, next) => {
  
//   const { id } = req.params;

//   let entry;
//   let debitLedger;
//   let creditLedger;

//   try {
//     entry = await Entry.findOne({ _id: id, user_id: req.user.id });
//     debitLedger = await Ledger.findOne({ _id: entry.debit_ledger });
//     creditLedger = await Ledger.findOne({ _id: entry.credit_ledger });
//   } catch (error) {
//     // for invalid mongodb objectId
//     throw new ErrorResponse("Entry not found", StatusCodes.NOT_FOUND);
//   }

//   if (!entry) {
//     throw new ErrorResponse("Entry not found", StatusCodes.NOT_FOUND);
//   }

//   debitLedger.balance += entry.amount;
//   creditLedger.balance -= entry.amount;

//   try {
//     entry.delete();
//     debitLedger.save();
//     creditLedger.save();

//     res.status(StatusCodes.OK).json({ success: true });
//   } catch (error) {
//     throw new ErrorResponse(
//       "Something went wrong",
//       StatusCodes.INTERNAL_SERVER_ERROR
//     );
//   }
// });




const searchEntryByNarration = asyncHandler(async (req, res, next) => {
  const PAGE =
    parseInt(req.query.page, 10) > 0 ? parseInt(req.query.page, 10) : 0;
  const KEYWORD = req.query.search;

  const entries = await Entry.find({
    $and: [{ user_id: req.user.id }, { narration: new RegExp(KEYWORD) }],
  })
    .sort("-created_at")
    .populate("debit_ledger", "-user_id -balance")
    .populate("credit_ledger", "-user_id -balance")
    .select(["-user_id"])
    .skip(PAGE * PAGINATION_LIMIT)
    .limit(PAGINATION_LIMIT);

  const response = {
    skip: PAGE * PAGINATION_LIMIT,
    limit: PAGINATION_LIMIT,
    total: await Entry.find({ user_id: req.user.id }).count(),
    entries,
  };

  res.status(StatusCodes.OK).json(response);
});





// fetch proof
const fetchProof = asyncHandler( async (req,res) => {
  
  
  const { fileName } = req.body;

  if(!fileName){
      return res.status(200).json({
          message: "No proof found",
          success:false
      })
  }


  // Construct the absolute path to the file
  const absolutePath = path.join(__dirname, '../..', 'uploads', fileName);

  // Check if the file exists
  if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({
          message: 'File not found',
          success: false
      });
  }

  // Determine the content type based on the file extension
  const contentType = getFileContentType(fileName);

  // Set the appropriate content type for the response
  res.setHeader('Content-Type', contentType);

  // Stream the file directly to the response
  fs.createReadStream(absolutePath).pipe(res);

}

)





// Function to determine content type based on file extension
function getFileContentType(fileName) {
const ext = path.extname(fileName).toLowerCase();
switch (ext) {
  case '.pdf':
      return 'application/pdf';
  case '.doc':
  case '.docx':
      return 'application/msword';
  case '.xls':
  case '.xlsx':
      return 'application/vnd.ms-excel';
  case '.jpg':
  case '.jpeg':
      return 'image/jpeg';
  case '.png':
      return 'image/png';
  // Add more cases for other file types if needed
  default:
      return 'application/octet-stream'; // Default to binary data
}
}



module.exports = {
  createEntry,
  getEntry,
  getEntries,
  editEntry,
  fetchProof,
  // normalizeEntries,
  // normalizeEntry,
  searchEntryByNarration,
};
