import asyncHandler from 'express-async-handler';

import connection from '../config/database.js';

const statisticDay = asyncHandler(async (req, res) => {
   const { startDate, endDate } = req.query;

   // Kiểm tra nếu startDate hoặc endDate không được cung cấp
   if (!startDate || !endDate) {
      return res.status(400).json({
         success: false,
         message: 'Bạn phải nhập thời gian bắt đầu và kết thúc',
      });
   }

   const start = new Date(startDate);
   const end = new Date(endDate);

   // Kiểm tra nếu startDate không nhỏ hơn endDate
   if (start > end) {
      return res.status(400).json({
         success: false,
         message: 'Thời gian bắt đầu phải trước thời gian kết thúc',
      });
   }

   // Phiếu nhập
   const queryListInput = `
      SELECT 
        rn.received_note_id,
        rn.employee_id,
        rn.supplier_id,
        CONVERT_TZ(rn.received_date, '+00:00', '+07:00') AS received_date,
        rnd.medicine_id,
        rnd.quantity,
        rnd.price
      FROM 
        ReceivedNotes rn
      JOIN 
        ReceivedNoteDetails rnd ON rn.received_note_id = rnd.received_note_id
      WHERE 
        DATE(rn.received_date) BETWEEN ? AND ?;
      `;

   const [resultsInput] = await connection.query(queryListInput, [
      startDate,
      endDate,
   ]);

   // Kiểm tra nếu resultsInput không có dữ liệu
   const maxPriceRowInput =
      resultsInput.length > 0
         ? resultsInput.reduce(
              (max, row) => (row.price > max.price ? row : max),
              resultsInput[0]
           )
         : null;
   const minPriceRowInput =
      resultsInput.length > 0
         ? resultsInput.reduce(
              (min, row) => (row.price < min.price ? row : min),
              resultsInput[0]
           )
         : null;
   const totalPriceInput = resultsInput.reduce(
      (sum, row) => sum + row.price,
      0
   );
   const avgPriceInput =
      resultsInput.length > 0 ? totalPriceInput / resultsInput.length : 0;

   // Phiếu chi
   const queryListOutput = `
      SELECT 
        dv.delivery_note_id,
        dv.employee_id,
        dv.customer_id,
        CONVERT_TZ(dv.delivery_date, '+00:00', '+07:00') AS delivery_date,
        dvd.medicine_id,
        dvd.quantity,
        dvd.price
      FROM 
        DeliveryNotes dv
      JOIN 
        DeliveryNoteDetails dvd ON dv.delivery_note_id = dvd.delivery_note_id
      WHERE 
        DATE(dv.delivery_date) BETWEEN ? AND ?;
      `;

   const [resultsOutput] = await connection.query(queryListOutput, [
      startDate,
      endDate,
   ]);

   // Kiểm tra nếu resultsOutput không có dữ liệu
   const maxPriceRowOutput =
      resultsOutput.length > 0
         ? resultsOutput.reduce(
              (max, row) => (row.price > max.price ? row : max),
              resultsOutput[0]
           )
         : null;
   const minPriceRowOutput =
      resultsOutput.length > 0
         ? resultsOutput.reduce(
              (min, row) => (row.price < min.price ? row : min),
              resultsOutput[0]
           )
         : null;
   const totalPriceOutput = resultsOutput.reduce(
      (sum, row) => sum + row.price,
      0
   );
   const avgPriceOutput =
      resultsOutput.length > 0 ? totalPriceOutput / resultsOutput.length : 0;

   const totalProfit = totalPriceInput - totalPriceOutput;

   // Trả về kết quả dưới dạng JSON
   return res.status(200).json({
      success: true,
      resultsInput,
      maxPriceRowInput: maxPriceRowInput || { price: 0 },
      minPriceRowInput: minPriceRowInput || { price: 0 },
      avgPriceInput,
      resultsOutput,
      maxPriceRowOutput: maxPriceRowOutput || { price: 0 },
      minPriceRowOutput: minPriceRowOutput || { price: 0 },
      avgPriceOutput,
      totalPriceInput,
      totalPriceOutput,
      totalProfit,
   });
});

const statisticQuarter = asyncHandler(async (req, res) => {
   const { quarter, year } = req.query; // Lấy tham số quarter và year từ query params

   // Kiểm tra nếu quarter hoặc year không được cung cấp
   if (!quarter || !year) {
      return res.status(400).json({ error: 'Bạn phải nhập quý và năm' });
   }

   // Phiếu nhập
   const queryListInput = `
      SELECT 
        rn.received_note_id,
        rn.employee_id,
        rn.supplier_id,
        CONVERT_TZ(rn.received_date, '+00:00', '+07:00') AS received_date,
        rnd.medicine_id,
        rnd.quantity,
        rnd.price
      FROM 
        ReceivedNotes rn
      JOIN 
        ReceivedNoteDetails rnd ON rn.received_note_id = rnd.received_note_id
      WHERE 
        QUARTER(DATE(rn.received_date)) = ? AND YEAR(DATE(rn.received_date)) = ?;
    `;

   const [resultsInput] = await connection.query(queryListInput, [
      quarter,
      year,
   ]);

   const maxPriceRowInput =
      resultsInput.length > 0
         ? resultsInput.reduce(
              (max, row) => (row.price > max.price ? row : max),
              resultsInput[0]
           )
         : null;
   const minPriceRowInput =
      resultsInput.length > 0
         ? resultsInput.reduce(
              (min, row) => (row.price < min.price ? row : min),
              resultsInput[0]
           )
         : null;

   const totalPriceInput = resultsInput.reduce(
      (sum, row) => sum + row.price,
      0
   );
   const avgPriceInput =
      resultsInput.length > 0 ? totalPriceInput / resultsInput.length : 0;

   // Phiếu chi
   const queryListOutput = `
      SELECT 
        dv.delivery_note_id,
        dv.employee_id,
        dv.customer_id,
        CONVERT_TZ(dv.delivery_date, '+00:00', '+07:00') AS delivery_date,
        dvd.medicine_id,
        dvd.quantity,
        dvd.price
      FROM 
        DeliveryNotes dv
      JOIN 
        DeliveryNoteDetails dvd ON dv.delivery_note_id = dvd.delivery_note_id
      WHERE 
        QUARTER(DATE(dv.delivery_date)) = ? AND YEAR(DATE(dv.delivery_date)) = ?;
    `;

   const [resultsOutput] = await connection.query(queryListOutput, [
      quarter,
      year,
   ]);

   const maxPriceRowOutput =
      resultsOutput.length > 0
         ? resultsOutput.reduce(
              (max, row) => (row.price > max.price ? row : max),
              resultsOutput[0]
           )
         : null;
   const minPriceRowOutput =
      resultsOutput.length > 0
         ? resultsOutput.reduce(
              (min, row) => (row.price < min.price ? row : min),
              resultsOutput[0]
           )
         : null;

   const totalPriceOutput = resultsOutput.reduce(
      (sum, row) => sum + row.price,
      0
   );
   const avgPriceOutput =
      resultsOutput.length > 0 ? totalPriceOutput / resultsOutput.length : 0;

   const totalProfit = totalPriceInput - totalPriceOutput;

   // Trả về kết quả dưới dạng JSON
   return res.status(200).json({
      success: true,
      resultsInput,
      maxPriceRowInput: maxPriceRowInput || { price: 0 },
      minPriceRowInput: minPriceRowInput || { price: 0 },
      avgPriceInput,
      resultsOutput,
      maxPriceRowOutput: maxPriceRowOutput || { price: 0 },
      minPriceRowOutput: minPriceRowOutput || { price: 0 },
      avgPriceOutput,
      totalPriceInput,
      totalPriceOutput,
      totalProfit,
   });
});

const statisticMonth = asyncHandler(async (req, res) => {
   const { month, year } = req.query; // Lấy tham số month và year từ query params

   // Kiểm tra nếu month hoặc year không được cung cấp
   if (!month || !year) {
      return res
         .status(400)
         .json({ success: false, message: 'Bạn phải nhập tháng và năm' });
   }

   // Phiếu nhập
   const queryListInput = `
      SELECT 
        rn.received_note_id,
        rn.employee_id,
        rn.supplier_id,
        CONVERT_TZ(rn.received_date, '+00:00', '+07:00') AS received_date,
        rnd.medicine_id,
        rnd.quantity,
        rnd.price
      FROM 
        ReceivedNotes rn
      JOIN 
        ReceivedNoteDetails rnd ON rn.received_note_id = rnd.received_note_id
      WHERE 
        MONTH(DATE(rn.received_date)) = ? AND YEAR(DATE(rn.received_date)) = ?;
    `;

   const [resultsInput] = await connection.query(queryListInput, [month, year]);
   const maxPriceRowInput =
      resultsInput.length > 0
         ? resultsInput.reduce(
              (max, row) => (row.price > max.price ? row : max),
              resultsInput[0]
           )
         : null;
   const minPriceRowInput =
      resultsInput.length > 0
         ? resultsInput.reduce(
              (min, row) => (row.price < min.price ? row : min),
              resultsInput[0]
           )
         : null;
   const totalPriceInput = resultsInput.reduce(
      (sum, row) => sum + row.price,
      0
   );
   const avgPriceInput =
      resultsInput.length > 0 ? totalPriceInput / resultsInput.length : 0;

   // Phiếu chi
   const queryListOutput = `
      SELECT 
        dv.delivery_note_id,
        dv.employee_id,
        dv.customer_id,
        CONVERT_TZ(dv.delivery_date, '+00:00', '+07:00') AS delivery_date,
        dvd.medicine_id,
        dvd.quantity,
        dvd.price
      FROM 
        DeliveryNotes dv
      JOIN 
        DeliveryNoteDetails dvd ON dv.delivery_note_id = dvd.delivery_note_id
      WHERE 
        MONTH(DATE(dv.delivery_date)) = ? AND YEAR(DATE(dv.delivery_date)) = ?;
    `;

   const [resultsOutput] = await connection.query(queryListOutput, [
      month,
      year,
   ]);
   const maxPriceRowOutput =
      resultsOutput.length > 0
         ? resultsOutput.reduce(
              (max, row) => (row.price > max.price ? row : max),
              resultsOutput[0]
           )
         : null;
   const minPriceRowOutput =
      resultsOutput.length > 0
         ? resultsOutput.reduce(
              (min, row) => (row.price < min.price ? row : min),
              resultsOutput[0]
           )
         : null;

   const totalPriceOutput = resultsOutput.reduce(
      (sum, row) => sum + row.price,
      0
   );
   const avgPriceOutput =
      resultsOutput.length > 0 ? totalPriceOutput / resultsOutput.length : 0;

   const totalProfit = totalPriceInput - totalPriceOutput;

   // Trả về kết quả dưới dạng JSON
   return res.status(200).json({
      success: true,
      resultsInput,
      maxPriceRowInput: maxPriceRowInput || { price: 0 },
      minPriceRowInput: minPriceRowInput || { price: 0 },
      avgPriceInput,
      resultsOutput,
      maxPriceRowOutput: maxPriceRowOutput || { price: 0 },
      minPriceRowOutput: minPriceRowOutput || { price: 0 },
      avgPriceOutput,
      totalPriceInput,
      totalPriceOutput,
      totalProfit,
   });
});

const statisticYear = asyncHandler(async (req, res) => {
   const { year } = req.query; // Lấy tham số year từ query params

   // Kiểm tra nếu year không được cung cấp
   if (!year) {
      return res.status(400).json({ error: 'Year is required' });
   }

   // Phiếu nhập
   const queryListInput = `
      SELECT 
        rn.received_note_id,
        rn.employee_id,
        rn.supplier_id,
        CONVERT_TZ(rn.received_date, '+00:00', '+07:00') AS received_date,
        rnd.medicine_id,
        rnd.quantity,
        rnd.price
      FROM 
        ReceivedNotes rn
      JOIN 
        ReceivedNoteDetails rnd ON rn.received_note_id = rnd.received_note_id
      WHERE 
        YEAR(rn.received_date) = ?;
    `;

   const [resultsInput] = await connection.query(queryListInput, [year]);

   const maxPriceRowInput =
      resultsInput.length > 0
         ? resultsInput.reduce(
              (max, row) => (row.price > max.price ? row : max),
              resultsInput[0]
           )
         : null;
   const minPriceRowInput =
      resultsInput.length > 0
         ? resultsInput.reduce(
              (min, row) => (row.price < min.price ? row : min),
              resultsInput[0]
           )
         : null;

   const totalPriceInput = resultsInput.reduce(
      (sum, row) => sum + row.price,
      0
   );
   const avgPriceInput = totalPriceInput / resultsInput.length;

   // Phiếu chi
   const queryListOutput = `
      SELECT 
        dv.delivery_note_id,
        dv.employee_id,
        dv.customer_id,
        CONVERT_TZ(dv.delivery_date, '+00:00', '+07:00') AS delivery_date,
        dvd.medicine_id,
        dvd.quantity,
        dvd.price
      FROM 
        DeliveryNotes dv
      JOIN 
        DeliveryNoteDetails dvd ON dv.delivery_note_id = dvd.delivery_note_id
      WHERE 
        YEAR(dv.delivery_date) = ?;
    `;

   const [resultsOutput] = await connection.query(queryListOutput, [year]);

   const maxPriceRowOutput =
      resultsOutput.length > 0
         ? resultsOutput.reduce(
              (max, row) => (row.price > max.price ? row : max),
              resultsOutput[0]
           )
         : null;
   const minPriceRowOutput =
      resultsOutput.length > 0
         ? resultsOutput.reduce(
              (min, row) => (row.price < min.price ? row : min),
              resultsOutput[0]
           )
         : null;

   const totalPriceOutput = resultsOutput.reduce(
      (sum, row) => sum + row.price,
      0
   );
   const avgPriceOutput = totalPriceOutput / resultsOutput.length;

   const totalProfit = totalPriceInput - totalPriceOutput;

   // Trả về kết quả dưới dạng JSON
   return res.status(200).json({
      success: true,
      resultsInput,
      maxPriceRowInput: maxPriceRowInput || { price: 0 },
      minPriceRowInput: minPriceRowInput || { price: 0 },
      avgPriceInput,
      resultsOutput,
      maxPriceRowOutput: maxPriceRowOutput || { price: 0 },
      minPriceRowOutput: minPriceRowOutput || { price: 0 },
      avgPriceOutput,
      totalPriceInput,
      totalPriceOutput,
      totalProfit,
   });
});

export default {
   statisticDay,
   statisticQuarter,
   statisticMonth,
   statisticYear,
};
