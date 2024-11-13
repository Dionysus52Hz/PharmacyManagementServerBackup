import asyncHandler from 'express-async-handler';
import bcrypt from 'bcrypt';

import connection from '../config/database.js';
import {
   generateAccessToken,
   generateRefreshToken,
} from '../middlewares/jwtMiddleware.js';

const getAllCategories = async (req, res) => {
   try {
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
      const [rows] = await connection.query('SELECT * FROM MedicineCategories');

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
      res.status(500).send('Error fetching medicine categories');
   }
};

const createCategory = asyncHandler(async (req, res) => {
   try {
      const { category_id, name, description } = req.body;
      const currentRoleUser = req.user.role;

      await connection.beginTransaction();
      if (currentRoleUser !== 'admin' && currentRoleUser !== 'staff') {
         return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền tạo loại thuốc mới.',
         });
      }

      // Kiểm tra dữ liệu đầu vào
      if (!category_id || !name || !description) {
         return res.status(400).json({
            success: false,
            message: 'Vui lòng cung cấp đầy đủ thông tin',
         });
      }

      await connection.query(
         'INSERT INTO MedicineCategories (category_id, name, description) VALUES (?, ?, ?)',
         [category_id, name, description]
      );

      // Lấy thông tin người dùng mới
      const [newCategory] = await connection.query(
         'SELECT category_id, name, description FROM MedicineCategories WHERE category_id = ?',
         [category_id]
      );

      await connection.commit();

      res.status(201).json({
         success: true,
         message: 'Tạo loại thuốc mới thành công',
         newCategory,
      });
   } catch (error) {
      if (connection) await connection.rollback();

      res.status(500).json(error);
   }
});

const updateCategory = asyncHandler(async (req, res) => {
   const { id } = req.params;

   const { category_id, name, description } = req.body;

   const currentUserRole = req.user.role;
   // Requesting user's role from JWT or session
   const currentUserId = req.user.id;

   // Kiểm tra quyền admin
   if (currentUserRole !== 'admin' && currentUserRole !== 'staff') {
      return res.status(403).json({
         success: false,
         message: 'Bạn không có quyền chỉnh sửa thông tin loại thuốc.',
      });
   }

   if (!category_id || !name || !description) {
      return res.status(400).json({
         success: false,
         message: 'Vui lòng cung cấp đầy đủ thông tin',
      });
   }

   await connection.beginTransaction();
   try {
      const [updatedCategory] = await connection.query(
         'SELECT * FROM MedicineCategories WHERE category_id = ?',
         [id]
      );
      if (updatedCategory.length === 0) {
         await connection.rollback();
         return res
            .status(404)
            .json({ success: false, message: 'Loại thuốc không tồn tại' });
      }

      const [result] = await connection.query(
         'UPDATE MedicineCategories SET category_id = ?, name = ?, description = ? WHERE category_id = ?',
         [category_id, name, description, id]
      );

      if (result.affectedRows === 0) {
         await connection.rollback();
         return res.status(404).json({
            success: false,
            message: 'Không tìm thấy loại thuốc',
         });
      }

      await connection.commit();
      return res.status(200).json({
         success: true,
         message: `Cập nhật thông tin loại thuốc có mã ${id} thành công`,
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

const deleteCategory = async (req, res) => {
   try {
      const currentUserRole = req.user.role;

      // Kiểm tra quyền admin
      if (currentUserRole !== 'admin' && currentUserRole !== 'staff') {
         return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền xoá loại thuốc.',
         });
      }
      const { id } = req.params;
      await connection.beginTransaction();

      // Execute the delete query within the transaction
      const [result] = await connection.query(
         'DELETE FROM MedicineCategories WHERE category_id = ?',
         [id]
      );

      if (result.affectedRows === 0) {
         // If no rows are affected, the detail doesn't exist
         await connection.rollback();
         return res.status(404).json({ message: 'Loại thuốc không tồn tại' });
      }

      // Commit the transaction if the delete is successful
      await connection.commit();
      res.status(200).json({ message: 'Loại thuốc đã được xóa' });
   } catch (error) {
      // Rollback the transaction in case of an error
      if (connection) await connection.rollback();
      res.status(500).json({ message: error.message });
   }

   // Kiểm tra xem người dùng cần xóa có tồn tại không
};

const getCategoryById = async (req, res) => {
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
         'SELECT * FROM MedicineCategories WHERE category_id = ?',
         [id]
      );

      if (rows.length === 0) {
         await connection.rollback(); // Rollback in case of not found to keep transaction clean
         return res.status(404).send('Category not found');
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
   getAllCategories,
   createCategory,
   updateCategory,
   deleteCategory,
   getCategoryById,
};
