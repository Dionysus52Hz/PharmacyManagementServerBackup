import asyncHandler from 'express-async-handler';
import bcrypt from 'bcrypt';

import connection from '../config/database.js';
import {
   generateAccessToken,
   generateRefreshToken,
} from '../middlewares/jwtMiddleware.js';

const generateUserId = async () => {
   const [lastId] = await connection.query('SELECT MAX(id) AS maxId FROM user');
   const maxId = lastId[0].maxId;

   // Kiểm tra nếu maxId là null và khởi tạo newId
   if (maxId) {
      const numericId = parseInt(maxId.replace('EP_', ''), 10); // Chuyển đổi thành số
      if (isNaN(numericId)) {
         throw new Error('Invalid maxId format'); // Ném lỗi nếu không thể chuyển đổi
      }
      console.log('maxId: ', maxId);
      return `EP_${String(numericId + 1).padStart(2, '0')}`;
   } else {
      console.log('maxId: ', maxId);
      return 'EP_01'; // Nếu không có người dùng nào, bắt đầu từ EP_01
   }
};

const register = async (req, res) => {
   const {
      username,
      password,
      fullname,
      address,
      phoneNumber,
      role = 'staff',
   } = req.body;

   try {
      await connection.beginTransaction();
      if (!username || !password || !fullname || !address || !phoneNumber) {
         return res
            .status(400)
            .json({ message: 'Bạn cần cung cấp đầy đủ thông tin.' });
      }

      // Kiểm tra mật khẩu
      const passwordRegex =
         /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(password)) {
         return res.status(400).json({
            message:
               'Mật khẩu phải gồm kí tự in hoa, kí tự thường, số và kí tự đặc biệt',
         });
      }

      // Kiểm tra số điện thoại
      if (!/^(09|03|07|08|05)\d{8}$/.test(phoneNumber)) {
         return res.status(400).json({
            message:
               'Số điện thoại phải có 10 chữ số và bắt đầu bằng 09, 03, 07, 08 hoặc 05.',
         });
      }

      // Kiểm tra username đã tồn tại
      // const [existingUser] = await connection.query('SELECT check_if_username_exists(?) AS exists', [username]);
      const [existingUser] = await connection.query(
         'SELECT check_if_username_exists(?) AS `exists`',
         [username]
      );
      if (existingUser[0].exists) {
         return res.status(400).json({
            message: 'Username đã tồn tại. Hãy đăng kí username khác',
         });
      }

      // Sử dụng auto-increment cho employee_id hoặc tạo ID tùy theo yêu cầu
      const [lastId] = await connection.query(
         'SELECT MAX(employee_id) AS maxId FROM employees'
      );
      const maxId = lastId[0].maxId;
      const newId = maxId
         ? `EP${String(parseInt(maxId.replace('EP', '')) + 1).padStart(2, '0')}`
         : 'EP01';

      // Mã hóa mật khẩu
      const hashedPassword = await bcrypt.hash(password, 10);

      // Thêm người dùng mới vào cơ sở dữ liệu
      await connection.query(
         'INSERT INTO employees (employee_id, username, password, fullname, address, phoneNumber, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
         [newId, username, hashedPassword, fullname, address, phoneNumber, role]
      );
      await connection.commit();

      // Lấy thông tin người dùng mới đã đăng ký
      const [newUser] = await connection.query(
         'SELECT employee_id, username, fullname, address, phoneNumber, role, createdAt, updatedAt FROM employees WHERE username = ?',
         [username]
      );

      console.log('Đăng ký thành công:', newUser[0]);
      return res.status(201).json({
         success: true,
         message: 'Đăng ký tài khoản thành công',
         user: newUser[0],
      });
   } catch (error) {
      await connection.rollback();
      console.error('Error in registration:', error);
      return res.status(500).json({ message: 'Server error', error });
   }
};

const login = asyncHandler(async (req, res) => {
   const { username, password } = req.body;

   if (!username || !password) {
      return res.status(400).json({
         success: false,
         message: 'Người dùng cần nhập username và password',
      });
   }

   // Check if the user exists
   const [user] = await connection.query(
      'SELECT * FROM employees WHERE username = ?',
      [username]
   );

   if (user.length === 0) {
      return res
         .status(404)
         .json({ success: false, message: 'Tài khoản không tồn tại' });
   }

   // Check if the user is locked
   if (user[0].isLocked) {
      return res
         .status(403)
         .json({ success: false, message: 'Tài khoản của bạn đã bị khóa' });
   }

   // Validate password
   const isMatch = await bcrypt.compare(password, user[0].password);
   if (!isMatch) {
      return res
         .status(401)
         .json({ success: false, message: 'Mật khẩu không đúng' });
   }

   // Generate tokens
   const accessToken = generateAccessToken(
      user[0].employee_id,
      user[0].username,
      user[0].role
   );
   const refreshToken = generateRefreshToken(user[0].employee_id);

   const userInfo = {
      employee_id: user[0].employee_id,
      username: user[0].username,
      fullname: user[0].fullname,
      address: user[0].address,
      phoneNumber: user[0].phoneNumber,
      role: user[0].role,
   };

   // await connection.query('UPDATE user SET refreshToken = ? WHERE username = ?', [refreshToken, username]);

   res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 * 7, // 7 day expires refreshToken
   });

   res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      accessToken,
      user: userInfo,
   });
});

const logout = asyncHandler(async (req, res) => {
   const cookie = req.cookies;

   // Check if the refreshToken exists in cookies
   // if (!cookie || !cookie.refreshToken) {
   //     return res.status(400).json({ success: false, message: 'Not found refresh token in cookies' });
   // }

   // Delete refreshToken from the database
   // const [result] = await connection
   //
   //     .query('UPDATE user SET refreshToken = NULL WHERE refreshToken = ?', [cookie.refreshToken]);

   // if (result.affectedRows === 0) {
   //     return res.status(400).json({ success: false, message: 'Refresh token not found in the database' });
   // }
   res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
   });
   return res.status(200).json({
      success: true,
      message: 'Đăng xuất thành công',
   });
});

const createUser = asyncHandler(async (req, res) => {
   const { username, password, fullname, address, phoneNumber } = req.body;
   const currentRoleUser = req.user.role;

   // Kiểm tra xem người dùng hiện tại có phải là admin
   if (currentRoleUser !== 'admin') {
      return res.status(403).json({
         success: false,
         message: 'Bạn không có quyền tạo người dùng mới.',
      });
   }

   // Kiểm tra dữ liệu đầu vào
   if (!username) {
      return res
         .status(400)
         .json({ success: false, message: 'Vui lòng cung cấp username' });
   }

   const finalPassword = password || '123456';

   // Kiểm tra số điện thoại
   if (phoneNumber && !/^(09|03|07|08|05)\d{8}$/.test(phoneNumber)) {
      return res.status(400).json({
         message:
            'Số điện thoại phải có 10 chữ số và bắt đầu bằng 09, 03, 07, 08 hoặc 05.',
      });
   }

   const [newIdResult] = await connection.query(
      'SELECT GenerateEmployeeId() AS newId'
   );
   const newId = newIdResult[0].newId;

   // Kiểm tra người dùng đã tồn tại
   const [existingUser] = await connection.query(
      'SELECT * FROM employees WHERE username = ?',
      [username]
   );
   if (existingUser.length > 0) {
      return res.status(400).json({
         success: false,
         message: 'Username đã tồn tại. Hãy đăng kí username khác',
      });
   }

   // Mã hóa mật khẩu
   const hashedPassword = await bcrypt.hash(finalPassword, 10);

   // Gọi stored procedure CreateEmployee để thêm người dùng mới
   await connection.query('CALL CreateEmployee(?, ?, ?, ?, ?, ?, ?)', [
      newId,
      username,
      hashedPassword,
      fullname,
      address,
      phoneNumber,
      'staff',
   ]);
   // Lấy thông tin người dùng mới
   const [newUser] = await connection.query(
      'SELECT employee_id, username, fullname, address, phoneNumber, role FROM employees WHERE username = ?',
      [username]
   );

   console.log('Đăng ký thành công:', newUser[0]);

   res.status(201).json({
      success: true,
      message: 'Tạo người dùng thành công',
      newUser,
   });
});

const updateUserFromAdmin = asyncHandler(async (req, res) => {
   const { id } = req.params; // ID to update, from URL
   const { fullname, address, phoneNumber } = req.body; // Updated information
   const currentUserRole = req.user.role;
   // Requesting user's role from JWT or session
   const currentUserId = req.user.id;

   // Kiểm tra quyền admin
   if (currentUserRole !== 'admin') {
      return res.status(403).json({
         success: false,
         message: 'Bạn không có quyền chỉnh sửa thông tin người dùng.',
      });
   }

   // Kiểm tra ít nhất một trường không để trống
   if (!fullname && !address && !phoneNumber) {
      return res.status(400).json({
         success: false,
         message:
            'Bạn cần nhập ít nhất một trong các thông tin: họ tên, địa chỉ, hoặc số điện thoại để chỉnh sửa',
      });
   }

   if (phoneNumber && !/^(09|03|07|08|05)\d{8}$/.test(phoneNumber)) {
      return res.status(400).json({
         message:
            'Số điện thoại phải có 10 chữ số và bắt đầu bằng 09, 03, 07, 08 hoặc 05.',
      });
   }

   await connection.beginTransaction();
   try {
      // Kiểm tra người dùng cần cập nhật có tồn tại không
      const [updatedUser] = await connection.query(
         'SELECT * FROM employees WHERE employee_id = ?',
         [id]
      );
      if (updatedUser.length === 0) {
         await connection.rollback();
         return res
            .status(404)
            .json({ success: false, message: 'Người dùng không tồn tại' });
      }

      // Kiểm tra quyền của người dùng cần được cập nhật
      const updatedUserRole = updatedUser[0].role;
      if (id !== currentUserId && updatedUserRole === 'admin') {
         await connection.rollback();
         return res.status(403).json({
            success: false,
            message:
               'Bạn không được phép chỉnh sửa thông tin của các admin khác',
         });
      }

      // Tạo câu lệnh cập nhật chỉ cho những trường đã có giá trị
      const updates = [];
      const values = [];

      if (fullname) {
         updates.push('fullname = ?');
         values.push(fullname);
      }
      if (address) {
         updates.push('address = ?');
         values.push(address);
      }
      if (phoneNumber) {
         updates.push('phoneNumber = ?');
         values.push(phoneNumber);
      }
      // Thêm id vào cuối để cập nhật cho đúng người dùng
      values.push(id);

      await connection.query(
         `UPDATE employees SET ${updates.join(', ')} WHERE employee_id = ?`,
         values
      );
      await connection.commit();
      return res.status(200).json({
         success: true,
         message: `Cập nhật thông tin người dùng với ID ${id} thành công`,
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

const deleteUser = async (req, res) => {
   const { id } = req.params; // ID cần xóa, lấy từ URL
   const currentRoleUser = req.user.role; // Role của người yêu cầu, lấy từ JWT

   // Chỉ cho phép admin thực hiện hành động xóa
   if (currentRoleUser !== 'admin') {
      return res.status(403).json({
         success: false,
         message: 'Chỉ có admin mới được phép xóa người dùng',
      });
   }

   await connection.beginTransaction();
   try {
      const [user] = await connection.query(
         'SELECT * FROM employees WHERE employee_id = ?',
         [id]
      );
      if (user.length === 0) {
         await connection.rollback();
         return res
            .status(404)
            .json({ success: false, message: 'Người dùng không tồn tại' });
      }

      const deletedRoleUser = user[0].role;

      // Chỉ cho phép xóa nếu người dùng có role là 'staff'
      if (deletedRoleUser !== 'staff') {
         await connection.rollback();
         return res.status(403).json({
            success: false,
            message: 'Admin chỉ có thể xóa staff',
         });
      }

      // Tiến hành xóa người dùng
      await connection.query('DELETE FROM employees WHERE employee_id = ?', [
         id,
      ]);
      await connection.commit();
      console.log(`Xóa thành công người dùng với ID ${id}`);

      return res.status(200).json({
         success: true,
         message: `Xóa thành công người dùng với ID ${id}`,
      });
   } catch (error) {
      // Nếu có lỗi, rollback transaction
      await connection.rollback();
      console.error('Error deleting user:', error);

      return res.status(500).json({
         success: false,
         message: 'Có lỗi xảy ra, không thể xóa người dùng.',
         error: error.message, // Gửi thêm thông tin lỗi chi tiết cho mục đích debug
      });
   }

   // Kiểm tra xem người dùng cần xóa có tồn tại không
};
const lockUser = async (req, res) => {
   const { id } = req.params; // ID người dùng cần khóa/mở khóa
   const currentRole = req.user.role;
   const currentUsername = req.user.username;

   await connection.beginTransaction();
   try {
      // Kiểm tra người dùng tồn tại
      const [user] = await connection.query(
         'SELECT * FROM employees WHERE employee_id = ?',
         [id]
      );
      if (user.length === 0) {
         await connection.rollback();
         return res
            .status(404)
            .json({ success: false, message: 'Người dùng không tồn tại' });
      }

      const targetRoleUser = user[0].role;
      const targetIsLocked = user[0].isLocked;

      if (currentRole !== 'admin') {
         await connection.rollback();
         return res.status(403).json({
            success: false,
            message: 'Chỉ có admin mới được phép khoá/mở khoá',
         });
      }

      // Ngăn không cho khóa/mở khóa chính mình
      if (user[0].username === currentUsername) {
         await connection.rollback();
         return res.status(403).json({
            success: false,
            message: 'Không được khóa/mở khóa chính mình',
         });
      }

      // Ngăn không cho khóa/mở khóa người cùng role
      if (currentRole === targetRoleUser) {
         await connection.rollback();
         return res.status(403).json({
            success: false,
            message: 'Không được khóa/mở khóa người có cùng chức vụ',
         });
      }

      // Chỉ cho phép admin khóa/mở khóa staff
      if (currentRole === 'admin' && targetRoleUser !== 'staff') {
         await connection.rollback();
         return res.status(403).json({
            success: false,
            message: 'Admin chỉ có thể khóa/mở khóa staff',
         });
      }

      // Đảo ngược trạng thái khóa/mở khóa
      const newIsLocked = !targetIsLocked;
      await connection.query(
         'UPDATE employees SET isLocked = ? WHERE employee_id = ?',
         [newIsLocked, id]
      );
      const action = newIsLocked ? 'Khóa' : 'Mở Khóa';
      console.log(`User với ID ${id} đã được ${action} bởi ${currentRole}`);

      await connection.commit();
      return res.status(200).json({
         success: true,
         message: `${action} tài khoản người dùng với ID ${id}`,
      });
   } catch (error) {
      // Rollback transaction nếu có lỗi
      await connection.rollback();
      console.error('Lỗi khi khóa/mở khóa người dùng:', error);
      res.status(500).json({
         success: false,
         message: 'Có lỗi xảy ra, không thể thực hiện khóa/mở khóa.',
         error: error.message,
      });
   }
};

const getDetailUser = asyncHandler(async (req, res) => {
   const { id } = req.params; // Lấy id từ URL parameters

   // Kiểm tra xem người dùng có tồn tại không
   const [user] = await connection.query(
      'SELECT * FROM employees WHERE employee_id = ?',
      [id]
   );
   if (user.length === 0) {
      return res
         .status(404)
         .json({ success: false, message: 'Người dùng không tồn tại' });
   }

   const userInfo = {
      id: user[0].id,
      username: user[0].username,
      fullname: user[0].fullname,
      address: user[0].address,
      phoneNumber: user[0].phoneNumber,
      role: user[0].role,
      isLocked: user[0].isLocked, // Nếu cần, có thể thêm trường này
   };

   return res.status(200).json({ success: true, userInfo });
});

const filterUser = asyncHandler(async (req, res) => {
   const { query, sortBy = 'username', order = 'asc' } = req.query; // Lấy query tìm kiếm và thông tin sắp xếp từ request
   // query: tìm từ ở tất cả fields

   // Kiểm tra thông tin sắp xếp
   const validSortFields = ['username', 'address', 'fullname', 'phoneNumber'];
   if (!validSortFields.includes(sortBy)) {
      return res
         .status(400)
         .json({ success: false, message: 'Thông tin sắp xếp không hợp lệ' });
   }

   const validOrder = ['asc', 'desc'];
   if (!validOrder.includes(order)) {
      return res
         .status(400)
         .json({ success: false, message: 'Thứ tự sắp xếp không hợp lệ' });
   }

   // Kiểm tra nếu query là phoneNumber và chỉ cho phép số
   if (query && sortBy === 'phoneNumber' && isNaN(query)) {
      return res.status(400).json({
         success: false,
         message: 'Query phải là số khi tìm kiếm theo số điện thoại.',
      });
   }

   // Tạo điều kiện tìm kiếm
   const searchCondition = query
      ? 'WHERE username LIKE ? OR address LIKE ? OR fullname LIKE ? OR phoneNumber LIKE ?'
      : '';
   const searchValues = query
      ? [
           `%${query}%`,
           `%${query}%`,
           `%${query}%`,
           `%${query}%`,
           //   query,
        ]
      : [];

   // Thực hiện truy vấn
   const [users] = await connection.query(
      `SELECT username, fullname, address, phoneNumber FROM employees ${searchCondition} ORDER BY ${sortBy} ${order}`,
      searchValues
   );

   res.status(200).json({
      success: true,
      users,
   });
});

const changePassword = async (req, res) => {
   const { id } = req.user; // Lấy id từ thông tin người dùng
   const { currentPassword, newPassword } = req.body;

   await connection.beginTransaction();
   try {
      // Kiểm tra xem người dùng đã cung cấp đầy đủ thông tin chưa
      if (!id || !currentPassword || !newPassword) {
         return res.status(400).json({
            message: 'Bạn cần cung cấp đủ thông tin để đổi mật khẩu.',
         });
      }

      // Kiểm tra mật khẩu mới
      const passwordRegex =
         /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(newPassword)) {
         return res.status(400).json({
            message:
               'Mật khẩu mới phải gồm kí tự in hoa, kí tự thường, số và kí tự đặc biệt',
         });
      }

      // Lấy thông tin người dùng từ cơ sở dữ liệu
      const [user] = await connection.query(
         'SELECT * FROM employees WHERE employee_id = ?',
         [id]
      );
      if (user.length === 0) {
         await connection.rollback();
         return res.status(404).json({ message: 'Người dùng không tồn tại.' });
      }

      // Kiểm tra mật khẩu hiện tại
      const isMatch = await bcrypt.compare(currentPassword, user[0].password);
      if (!isMatch) {
         await connection.rollback();
         return res
            .status(400)
            .json({ message: 'Mật khẩu hiện tại không đúng.' });
      }

      // Mã hóa mật khẩu mới
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await connection.query(
         'UPDATE employees SET password = ? WHERE employee_id = ?',
         [hashedNewPassword, id]
      );

      await connection.commit();
      console.log('Đổi mật khẩu thành công cho người dùng với ID ', id);
      return res.status(200).json({ message: 'Đổi mật khẩu thành công.' });
   } catch (error) {
      await connection.rollback(); // Hoàn nguyên transaction nếu có lỗi
      console.error('Error in changing password:', error);
      return res
         .status(500)
         .json({ message: 'Server error', error: error.message });
   }
};

// const forgotPassword = asyncHandler(async (req, res) => {
//     const { email } = req.body;
//     if (!email) throw new Error('Email not found');
//     const user = await User.findOne({ email });
//     if (!user) throw new Error('User not found');

//     const resetToken = user.createPasswordChangeToken();
//     await user.save();

//     const html = `
//         Vui lòng nhấp vào link dưới đây để thay đổi mật khẩu của bạn.
//         Link này sẽ hết hạn sau 5 phút kể từ bây giờ. <a href=${process.env.URI_CLIENT}/resetPassword/${resetToken}>Nhấp vào đây</a>
//     `;

//     const data = {
//         email,
//         html,
//     };
//     const infoMailUser = await sendMail(data);
//     return res.status(200).json({
//         success: infoMailUser?.response?.includes('OK') ? true : false,
//         message: infoMailUser?.response?.includes('OK') ? 'Check mail to do a next step' : 'Error, please try again',
//     });
// });

// const resetPassword = asyncHandler(async (req, res) => {
//     const { password, token } = req.body;
//     if (!password || !token) throw new Error('Missing password or token');
//     const passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
//     // gt: higher than, lt: lower than
//     const user = await User.findOne({ passwordResetToken, passwordResetExpires: { $gt: Date.now() } });
//     if (!user) throw new Error('Invalid reset token. Please try again forgot password');
//     user.password = password;
//     user.passwordResetToken = undefined;
//     user.passwordResetExpires = undefined;
//     user.passwordChangedAt = Date.now();
//     await user.save();
//     return res.status(200).json({
//         success: user ? true : false,
//         message: user ? 'Reset password successfully. Please login your account' : 'Failed update password',
//     });
// });

const updateInfoMySelf = async (req, res) => {
   const { fullname, address, phoneNumber } = req.body; // Các trường được phép cập nhật
   const id = req.user.id; // Lấy id từ thông tin người dùng đăng nhập (JWT hoặc session)

   if (!id)
      return res.status(401).json({
         success: false,
         message: 'Bạn không được phép cập nhật thông tin chính mình',
      });

   // Kiểm tra ít nhất một trường không để trống
   if (!fullname && !address && !phoneNumber) {
      return res.status(400).json({
         success: false,
         message:
            'Bạn cần nhập ít nhất một trong các thông tin: họ tên, địa chỉ, hoặc số điện thoại để cập nhật',
      });
   }

   // Kiểm tra định dạng số điện thoại
   if (phoneNumber && !/^(09|03|07|08|05)\d{8}$/.test(phoneNumber)) {
      return res.status(400).json({
         message:
            'Số điện thoại phải có 10 chữ số và bắt đầu bằng 09, 03, 07, 08 hoặc 05.',
      });
   }

   // Tạo câu lệnh cập nhật chỉ cho những trường có giá trị
   const updates = [];
   const values = [];

   if (fullname) {
      updates.push('fullname = ?');
      values.push(fullname);
   }
   if (address) {
      updates.push('address = ?');
      values.push(address);
   }
   if (phoneNumber) {
      updates.push('phoneNumber = ?');
      values.push(phoneNumber);
   }

   // Thêm id vào cuối để cập nhật đúng người dùng
   values.push(id);

   await connection.beginTransaction();

   try {
      // Cập nhật thông tin trong cơ sở dữ liệu
      await connection.query(
         `UPDATE employees SET ${updates.join(', ')} WHERE employee_id = ?`,
         values
      );
      await connection.commit();

      console.log(`Cập nhật thông tin thành công cho người dùng với ID ${id}`);
      return res.status(200).json({
         success: true,
         message: `Cập nhật thông tin thành công cho người dùng với ID ${id}`,
      });
   } catch (error) {
      await connection.rollback();
      console.error('Error updating user info:', error.message);
      return res.status(500).json({
         success: false,
         message: 'Đã xảy ra lỗi khi cập nhật thông tin người dùng',
         error: error.message,
      });
   }
};

const getAllUsers = asyncHandler(async (req, res) => {
   try {
      // Lấy tất cả người dùng từ bảng employees
      const [users] = await connection.query('SELECT * FROM employees');

      if (users.length === 0) {
         return res.status(404).json({
            success: false,
            message: 'Không có người dùng nào trong hệ thống',
         });
      }

      // Tạo mảng userInfo chứa thông tin cần thiết của mỗi người dùng
      const userInfo = users.map((user) => ({
         employee_id: user.employee_id,
         username: user.username,
         fullname: user.fullname,
         address: user.address,
         phoneNumber: user.phoneNumber,
         role: user.role,
         isLocked: user.isLocked, // Nếu cần thêm thông tin này
      }));

      return res.status(200).json({
         success: true,
         users: userInfo,
      });
   } catch (error) {
      console.error('Error fetching all users:', error);
      return res.status(500).json({
         success: false,
         message: 'Đã xảy ra lỗi khi lấy danh sách người dùng',
      });
   }
});

export default {
   register,
   login,
   logout,
   createUser,
   updateUserFromAdmin,
   deleteUser,
   lockUser,
   getDetailUser,
   filterUser,
   changePassword,
   updateInfoMySelf,
   getAllUsers,
};
