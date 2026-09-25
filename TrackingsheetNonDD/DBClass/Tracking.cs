using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using System.Collections;
using System.Data;
using System.Data.SqlClient;
using System.Security.Cryptography;
using System.Text;
using static TrackingsheetNonDD.Controllers.TrackingSheet;

namespace TrackingsheetNonDD.DBClass
{
    public class Tracking
    {

        private readonly IConfiguration _configuration;


        public Tracking(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        //Login User 
        public int ValidateUser(string username, string password)
        {
            using (SqlConnection con = new SqlConnection(_configuration.GetConnectionString("InfinityERP")))
            {
                con.Open();
                string encPassword = Encrypt(password);
                using (SqlCommand cmd = new SqlCommand("usp_ValidateUser", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add("@Username", SqlDbType.NVarChar, 100).Value = username.Trim();
                    cmd.Parameters.Add("@Password", SqlDbType.NVarChar, 100).Value = encPassword;
                    SqlParameter returnParam = new SqlParameter("@ReturnValue", SqlDbType.Int)
                    {
                        Direction = ParameterDirection.ReturnValue
                    };
                    cmd.Parameters.Add(returnParam);
                    cmd.ExecuteNonQuery();
                    int result = Convert.ToInt32(returnParam.Value);
                    if (result == 0)
                    {
                        cmd.Parameters.Clear();
                        cmd.Parameters.Add("@Username", SqlDbType.NVarChar, 100).Value = username.Trim();
                        cmd.Parameters.Add("@Password", SqlDbType.NVarChar, 100).Value = password.Trim(); 
                       
                        SqlParameter returnParamPlain = new SqlParameter("@ReturnValue", SqlDbType.Int)
                        {
                            Direction = ParameterDirection.ReturnValue
                        };
                        cmd.Parameters.Add(returnParamPlain);
                        cmd.ExecuteNonQuery();
                        result = Convert.ToInt32(returnParamPlain.Value);
                    }
                    return result;
                }
            }
        }


        public string Encrypt(string clearText)
        {
            string EncryptionKey = "MAKV2SPBNI99212";
            byte[] clearBytes = Encoding.Unicode.GetBytes(clearText);
            using (Aes encryptor = Aes.Create())
            {
                Rfc2898DeriveBytes pdb = new Rfc2898DeriveBytes(EncryptionKey, new byte[] { 0x49, 0x76, 0x61, 0x6e, 0x20, 0x4d, 0x65, 0x64, 0x76, 0x65, 0x64, 0x65, 0x76 });
                encryptor.Key = pdb.GetBytes(32);
                encryptor.IV = pdb.GetBytes(16);
                using (MemoryStream ms = new MemoryStream())
                {
                    using (CryptoStream cs = new CryptoStream(ms, encryptor.CreateEncryptor(), CryptoStreamMode.Write))
                    {
                        cs.Write(clearBytes, 0, clearBytes.Length);
                        cs.Close();
                    }
                    clearText = Convert.ToBase64String(ms.ToArray());
                }
            }
            return clearText;
        }


        public int CheckPM(int EmployeeID)
        {
            int returnValue = 0;
            using (SqlConnection con = new SqlConnection(_configuration.GetConnectionString("Commitment")))
            {
                using (SqlCommand cmd = new SqlCommand("usp_CheckPM", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add("@EmployeeID", SqlDbType.BigInt).Value = EmployeeID;
                    SqlParameter returnParam = new SqlParameter("@ReturnValue", SqlDbType.Int)
                    {
                        Direction = ParameterDirection.ReturnValue
                    };
                    cmd.Parameters.Add(returnParam);

                    con.Open();
                    cmd.ExecuteNonQuery();

                    if (returnParam.Value != DBNull.Value)
                    {
                        returnValue = Convert.ToInt32(returnParam.Value);
                    }
                }
            }

            return returnValue; 
        }

        //Get Project User Wise
        public DataTable GetAllProjectByUserRights(string EmployeeID)    
        {
            DataTable dt = new DataTable();

            using (SqlConnection con = new SqlConnection(_configuration.GetConnectionString("Commitment")))
            {
                using (SqlCommand cmd = new SqlCommand("[WBT_usp_GetAllProjectByUserRightsFor_OnlineTracking]", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add("@EmployeeID", SqlDbType.NVarChar, 100).Value = EmployeeID.Trim();
                    using (SqlDataAdapter da = new SqlDataAdapter(cmd))
                    {
                        da.Fill(dt);
                    }
                }
            }

            return dt;
        }

        //Get Project wise Traking Sheet Headers and Data 
        public DataSet getProjectHeadersDataSet(int ProjectID, DateTime fromDate, DateTime toDate)
        {
            DataSet ds = new DataSet();
            using (SqlConnection con = new SqlConnection(_configuration.GetConnectionString("InfinityERP")))
            {
                using (SqlCommand cmd = new SqlCommand("WBT_usp_GetTarckingsheetProjectHeaders_YTU", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add("@ProjectID", SqlDbType.BigInt).Value = ProjectID;
                    cmd.Parameters.Add("@FromDate", SqlDbType.Date).Value = fromDate;
                    cmd.Parameters.Add("@ToDate", SqlDbType.Date).Value = toDate;

                    using (SqlDataAdapter da = new SqlDataAdapter(cmd))
                    {
                        da.Fill(ds);
                    }
                }
            }
            return ds;
        }

        //Insert Single/Bulk Order
        public int InsertOrderCreateSingleOrder(Hashtable htParam)
        {
            using (SqlConnection con = new SqlConnection(_configuration.GetConnectionString("InfinityERP")))
            {
                using (SqlCommand cmd = new SqlCommand("WBT_CreateSingleOrder_YTU", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add("@ProjectId", SqlDbType.BigInt).Value = htParam["ProjectID"] ?? DBNull.Value;
                    cmd.Parameters.Add("@OrderNo", SqlDbType.NVarChar, -1).Value = htParam["Order#"] ?? DBNull.Value; 
                    cmd.Parameters.Add("@OrderDate", SqlDbType.NVarChar, 100).Value = htParam["OrderDate"] ?? DBNull.Value;
                    cmd.Parameters.Add("@AddedBy", System.Data.SqlDbType.BigInt, 0).Value = htParam["AddedBy"] ?? DBNull.Value;

                    SqlParameter returnParam = new SqlParameter("@ReturnValue", SqlDbType.BigInt)
                    {
                        Direction = ParameterDirection.ReturnValue
                    };
                    cmd.Parameters.Add(returnParam);

                    con.Open();
                    cmd.ExecuteNonQuery();

                    int returnValue = Convert.ToInt32(returnParam.Value);
                    return returnValue;
                }
            }
        }
  
        //insert selected Files
        public int InsertOrderCreationFiles(Hashtable htParam)
        {
            using (SqlConnection con = new SqlConnection(_configuration.GetConnectionString("Commitment")))
            {
                using (SqlCommand cmd = new SqlCommand("WBT_InsertOrderCreationAttachment_YTU", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;

                    cmd.Parameters.Add("@ProjectId", SqlDbType.BigInt).Value = htParam["ProjectId"] ?? DBNull.Value;       
                    cmd.Parameters.Add("@FilePath", System.Data.SqlDbType.NVarChar,500).Value = htParam["FilePath"] ?? DBNull.Value;
                    cmd.Parameters.Add("@AddedBy", System.Data.SqlDbType.BigInt, 0).Value = htParam["AddedBy"] ?? DBNull.Value;
                    cmd.Parameters.Add("@OrderNo", SqlDbType.NVarChar, -1).Value = htParam["OrderNo"] ?? DBNull.Value;
                    cmd.Parameters.Add("@processName", SqlDbType.NVarChar, -1).Value = htParam["ProcessName"] ?? DBNull.Value;

                    SqlParameter returnParam = new SqlParameter("@ReturnValue", SqlDbType.BigInt)
                    {
                        Direction = ParameterDirection.ReturnValue
                    };
                    cmd.Parameters.Add(returnParam);

                    con.Open();
                    cmd.ExecuteNonQuery();

                    int returnValue = Convert.ToInt32(returnParam.Value);
                    return returnValue;
                }
            }
        }


        public DataTable GetPackageDetailsByProcess(int projectId, string orderNumber,string pqaprocess)
        {
            DataTable dt = new DataTable();
            using (SqlConnection con = new SqlConnection(_configuration.GetConnectionString("Commitment")))
            {
                using (SqlCommand cmd = new SqlCommand("WBT_GetOrderAttachments_YTU", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add("@ProjectID", SqlDbType.BigInt).Value = projectId;
                    cmd.Parameters.Add("@OrderNumber", SqlDbType.NVarChar, 500).Value = orderNumber.Trim();
                    cmd.Parameters.Add("@ProcessType", SqlDbType.NVarChar, 500).Value = pqaprocess.Trim();

                    using (SqlDataAdapter da = new SqlDataAdapter(cmd))
                    {
                        da.Fill(dt);
                    }
                }
            }
            return dt;
        }

        public int UpdateProjectTrackingCellValue(List<TrackingValueUpdateModel> payload)
        {
            DataTable dt = new DataTable();
            dt.Columns.Add("RowId", typeof(long));
            dt.Columns.Add("FieldConfigId", typeof(long));
            dt.Columns.Add("FieldValue", typeof(string));
            dt.Columns.Add("ProjectId", typeof(long));
            dt.Columns.Add("AddedBy", typeof(long));

            foreach (var item in payload)
            {
                dt.Rows.Add( item.RowId,item.FieldConfigId,item.FieldValue ?? (object)DBNull.Value,item.projectId, item.EmployeeId);
            }
            using (SqlConnection con = new SqlConnection(_configuration.GetConnectionString("InfinityERP")))
            {
                using (SqlCommand cmd = new SqlCommand("WBT_InsertUpdateTrackingCellValue_YTU", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;

                    SqlParameter tvpParam = cmd.Parameters.AddWithValue("@TrackingData", dt);
                    tvpParam.SqlDbType = SqlDbType.Structured;
                    tvpParam.TypeName = "dbo.AddUpdateTrackingValue";

                    SqlParameter returnParam = new SqlParameter("@ReturnValue", SqlDbType.Int)
                    {
                        Direction = ParameterDirection.ReturnValue
                    };
                    cmd.Parameters.Add(returnParam);
                    con.Open();
                    cmd.ExecuteNonQuery();

                    int returnValue = Convert.ToInt32(returnParam.Value);
                    return returnValue;
                }
            }
        }


        public int InsertProcessFeedback(ProcessFeedbackModel model)
        {
            using (SqlConnection con = new SqlConnection(_configuration.GetConnectionString("Commitment")))
            {
                // Replace with your actual stored procedure name for saving process feedback
                using (SqlCommand cmd = new SqlCommand("usp_InsertFeedbackForNewOrder_KRL", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;

                    cmd.Parameters.Add("@OrderNo", SqlDbType.NVarChar, 100).Value = (object)model.OrderNumber ?? DBNull.Value;
                    cmd.Parameters.Add("@DealNo", SqlDbType.NVarChar, 100).Value = (object)model.DealNo ?? DBNull.Value;
                    cmd.Parameters.Add("@OrderDate", SqlDbType.NVarChar, 12).Value = model.OrderDate != default ? model.OrderDate : (object)DBNull.Value;
                    cmd.Parameters.Add("@ProjectID", SqlDbType.BigInt).Value = model.ProjectId;
                    cmd.Parameters.Add("@ProcessID", SqlDbType.BigInt).Value = model.ProcessID;
                    cmd.Parameters.Add("@ErrorDoneBy", SqlDbType.NVarChar, 100).Value = (object)model.ErrorDoneBy ?? DBNull.Value;
                    cmd.Parameters.Add("@FeedbackGivenBy", SqlDbType.NVarChar, 100).Value = (object)model.FeedbackGivenBy ?? DBNull.Value;
                    cmd.Parameters.Add("@AddedBy", SqlDbType.BigInt).Value = model.AddedBy;

                    SqlParameter returnParam = new SqlParameter("@ReturnValue", SqlDbType.BigInt)
                    {
                        Direction = ParameterDirection.ReturnValue
                    };
                    cmd.Parameters.Add(returnParam);

                    con.Open();
                    cmd.ExecuteNonQuery();

                    int returnValue = cmd.Parameters["@ReturnValue"].Value != DBNull.Value
                        ? Convert.ToInt32(cmd.Parameters["@ReturnValue"].Value)
                        : 0;

                    return returnValue;
                }
            }
        }

        public int AddFeedbackForNewOrder(Hashtable htParam)
        {
            using (SqlConnection con = new SqlConnection(_configuration.GetConnectionString("Commitment")))
            {
                using (SqlCommand cmd = new SqlCommand("usp_AddFeedbackForNewOrder_1", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;

                    cmd.Parameters.Add("@Feedback", SqlDbType.NVarChar, 100).Value = htParam["Feedback"] ?? (object)DBNull.Value;
                    cmd.Parameters.Add("@ErrorType", SqlDbType.NVarChar, 10000).Value = htParam["ErrorType"] ?? (object)DBNull.Value;
                    cmd.Parameters.Add("@Fatal", SqlDbType.NVarChar, 10000).Value = htParam["Fatal"] ?? (object)DBNull.Value;
                    cmd.Parameters.Add("@ErrorField", SqlDbType.NVarChar, 10000).Value = htParam["ErrorField"] ?? (object)DBNull.Value;
                    cmd.Parameters.Add("@Section", SqlDbType.NVarChar, 10000).Value = htParam["Section"] ?? (object)DBNull.Value;
                    cmd.Parameters.Add("@Field", SqlDbType.NVarChar, 10000).Value = htParam["Field"] ?? (object)DBNull.Value;
                    cmd.Parameters.Add("@Error", SqlDbType.NVarChar, 10000).Value = htParam["Error"] ?? (object)DBNull.Value;
                    cmd.Parameters.Add("@Shouldbe", SqlDbType.NVarChar, 10000).Value = htParam["Shouldbe"] ?? (object)DBNull.Value;
                    cmd.Parameters.Add("@FeedbackType", SqlDbType.NVarChar, 10000).Value = htParam["FeedbackType"] ?? (object)DBNull.Value;
                    cmd.Parameters.Add("@FeedbackRecivedDate", SqlDbType.NVarChar, 10000).Value = htParam["FeedbackRecivedDate"] ?? (object)DBNull.Value;
                    cmd.Parameters.Add("@Remark", SqlDbType.NVarChar, 10000).Value = htParam["Remark"] ?? (object)DBNull.Value;
                    cmd.Parameters.Add("@FeedbackerrorPath", SqlDbType.NVarChar, 10000).Value = htParam["FeedbackerrorPath"] ?? (object)DBNull.Value;
                    cmd.Parameters.Add("@AddedBy", SqlDbType.BigInt).Value = htParam["AddedBy"] ?? (object)DBNull.Value;

                    SqlParameter returnParam = new SqlParameter("@ReturnValue", SqlDbType.BigInt)
                    {
                        Direction = ParameterDirection.ReturnValue
                    };
                    cmd.Parameters.Add(returnParam);

                    con.Open();
                    cmd.ExecuteNonQuery();

                    int returnValue = Convert.ToInt32(returnParam.Value);
                    return returnValue;
                }
            }
        }

        public DataSet getUserCode(int ProjectID)
        {
            DataSet ds = new DataSet();
            using (SqlConnection con = new SqlConnection(_configuration.GetConnectionString("Commitment")))
            {
                using (SqlCommand cmd = new SqlCommand("WBT_usp_GetAllCodeByProject", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add("@ProjectID", SqlDbType.BigInt).Value = ProjectID;    
                    using (SqlDataAdapter da = new SqlDataAdapter(cmd))
                    {
                        da.Fill(ds);
                    }
                }
            }
            return ds;
        }

        public object GetProjectWiseOrdersDetails(int empId,string Code)
        {
            int total = 0; int pending = 0; int complete = 0;
            var feedbackList = new List<object>();

            using (SqlConnection con = new SqlConnection(_configuration.GetConnectionString("Commitment")))
            {
                using (SqlCommand cmd = new SqlCommand("GetProjectWiseOrdersDetails_YTU", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add("@empId", SqlDbType.Int).Value = empId;
                    cmd.Parameters.Add("@Code", SqlDbType.NVarChar).Value = Code;

                    con.Open();
                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            total = reader.GetInt32(reader.GetOrdinal("TotalRowsCount"));
                        }

                        if (reader.NextResult() && reader.Read())
                        {
                            pending = reader.GetInt32(reader.GetOrdinal("PendingInProgressHoldCount"));
                        }

                        if (reader.NextResult() && reader.Read())
                        {
                            complete = reader.GetInt32(reader.GetOrdinal("CompleteCount"));
                        }

                        if (reader.NextResult())
                        {
                            while (reader.Read())
                            {
                                feedbackList.Add(new
                                {
                                    FeedbackFrom = reader["Feedback From"].ToString(),
                                    OrderNumber = reader["Order Number"].ToString(),
                                    OrderDate = reader["Order Date"] != DBNull.Value ? Convert.ToDateTime(reader["Order Date"]).ToString("dd MMM yyyy") : "",
                                    FeedbackRemark = reader["Feedback Remark"].ToString(),
                                    Status = reader["Status"].ToString()
                                });
                            }
                        }
                    }
                }
            }

            return new
            {
                Total = total,
                Pending = pending,
                Complete = complete,
                Feedbacks = feedbackList 
            };
        }





    }
}

