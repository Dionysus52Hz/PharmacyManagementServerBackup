import asyncHandler from 'express-async-handler';
import bcrypt from 'bcrypt';

import connection from '../config/database.js';
import {
   generateAccessToken,
   generateRefreshToken,
} from '../middlewares/jwtMiddleware.js';

const getAllCustomers = async (req, res) => {
   try {
      console.log(req);
      const currentUserRole = req.user.role;
      console.log(currentUserRole);

      // Kiểm tra quyền admin
      if (currentUserRole !== 'admin' && currentUserRole !== 'staff') {
         return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền xem thông tin này.',
         });
      }
      await connection.beginTransaction();
      const [rows] = await connection.query('SELECT * FROM Customers');

      // Commit the transaction (even though no changes are made, it finalizes the read operation)
      await connection.commit();

      // Send the result
      res.status(200).json({
         success: true,
         data: rows,
      });
   } catch (error) {
      // Rollback the transaction if there's an error
      if (connection) await connection.rollback();
      res.status(500).send('Error fetching customers');
   }
};

const createCustomer = asyncHandler(async (req, res) => {
   try {
      const { customer_name, phone, address } = req.body;
      const currentRoleUser = req.user.role;

      await connection.beginTransaction();
      if (currentRoleUser !== 'admin' && currentRoleUser !== 'staff') {
         return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền tạo khách hàng mới.',
         });
      }

      // Kiểm tra dữ liệu đầu vào
      if (!customer_name || !phone || !address) {
         return res.status(400).json({
            success: false,
            message: 'Vui lòng cung cấp đầy đủ thông tin',
         });
      }

      let [id] = await connection.query('SELECT customer_id FROM Customers');
      id = id.map((v) => v.customer_id);
      const maxId = Math.max(...id.map((e) => parseInt(e.slice(2), 10)));
      const newId = `KH${String(maxId + 1).padStart(2, '0')}`;
      await connection.query(
         'INSERT INTO Customers (customer_id, name, phone, address) VALUES (?, ?, ?, ?)',
         [newId, customer_name, phone, address]
      );

      // Lấy thông tin người dùng mới
      const [newCustomer] = await connection.query(
         'SELECT customer_id, name, phone, address FROM Customers WHERE customer_id = ?',
         [newId]
      );

      await connection.commit();
      console.log(newCustomer);

      res.status(201).json({
         success: true,
         message: 'Tạo khách hàng mới thành công',
         newCustomer,
      });
   } catch (error) {
      console.log(error);
      if (connection) await connection.rollback();

      res.status(500).json(error);
   }
});

const updateCustomer = asyncHandler(async (req, res) => {
   const { id } = req.params;

   const { customer_id, name, phone, address } = req.body;

   const currentUserRole = req.user.role;
   // Requesting user's role from JWT or session
   const currentUserId = req.user.id;

   // Kiểm tra quyền admin
   if (currentUserRole !== 'admin' && currentUserRole !== 'staff') {
      return res.status(403).json({
         success: false,
         message: 'Bạn không có quyền chỉnh sửa thông tin khách hàng.',
      });
   }

   if (!customer_id || !name || !phone || !address) {
      return res.status(400).json({
         success: false,
         message: 'Vui lòng cung cấp đầy đủ thông tin',
      });
   }

   await connection.beginTransaction();
   try {
      const [updatedCustomer] = await connection.query(
         'SELECT * FROM Customers WHERE customer_id = ?',
         [id]
      );
      if (updatedCustomer.length === 0) {
         await connection.rollback();
         return res
            .status(404)
            .json({ success: false, message: 'Khách hàng không tồn tại' });
      }

      const [result] = await connection.query(
         'UPDATE Customers SET customer_id = ?, name = ?, phone = ?, address = ? WHERE customer_id = ?',
         [customer_id, name, phone, address, id]
      );

      if (result.affectedRows === 0) {
         await connection.rollback();
         return res.status(404).json({
            success: false,
            message: 'Không tìm thấy khách hàng',
         });
      }

      await connection.commit();
      return res.status(200).json({
         success: true,
         message: `Cập nhật thông tin khách hàng có mã ${id} thành công`,
      });
   } catch (error) {
      // Nếu có lỗi, quay lại trạng thái trước transaction
      await connection.rollback();
      return res.status(500).json({
         success: false,
         message: 'Có lỗi xảy ra, không thể cập nhật thông tin.',
         error: error.message, // Gửi thêm thông tin lỗi chi tiết cho mục đích debug
      });
   }
});

const deleteCustomer = async (req, res) => {
   try {
      const currentUserRole = req.user.role;

      // Kiểm tra quyền admin
      if (currentUserRole !== 'admin' && currentUserRole !== 'staff') {
         return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền xoá khách hàng.',
         });
      }
      const { id } = req.params;
      await connection.beginTransaction();

      // Execute the delete query within the transaction
      const [result] = await connection.query(
         'DELETE FROM Customers WHERE customer_id = ?',
         [id]
      );

      if (result.affectedRows === 0) {
         // If no rows are affected, the detail doesn't exist
         await connection.rollback();
         return res.status(404).json({ message: 'Khách hàng không tồn tại' });
      }

      // Commit the transaction if the delete is successful
      await connection.commit();
      res.status(200).json({ message: 'Khách hàng đã được xóa' });
   } catch (error) {
      // Rollback the transaction in case of an error
      if (connection) await connection.rollback();
      res.status(500).json({ message: error.message });
   }

   // Kiểm tra xem người dùng cần xóa có tồn tại không
};

const getCustomerById = async (req, res) => {
   const { id } = req.params;
   const currentUserRole = req.user.role;

   if (currentUserRole !== 'admin' && currentUserRole !== 'staff') {
      return res.status(403).json({
         success: false,
         message: 'Bạn không có quyền xem thông tin này.',
      });
   }
   try {
      // Start a transaction
      await connection.beginTransaction();

      // Execute the SELECT query within the transaction
      const [rows] = await connection.query(
         'SELECT * FROM Customers WHERE customer_id = ?',
         [id]
      );

      if (rows.length === 0) {
         await connection.rollback(); // Rollback in case of not found to keep transaction clean
         return res.status(404).send('Customer not found');
      }

      // Commit the transaction after a successful fetch
      await connection.commit();

      // Send the result
      res.json(rows[0]);
   } catch (error) {
      // Rollback the transaction if there's an error
      if (connection) await connection.rollback();
      res.status(500).json(error);
   }
};

export default {
   getAllCustomers,
   createCustomer,
   updateCustomer,
   deleteCustomer,
   getCustomerById,
};
