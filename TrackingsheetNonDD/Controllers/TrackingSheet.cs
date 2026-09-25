using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Collections;
using System.Data;
using TrackingsheetNonDD.DBClass;

namespace TrackingsheetNonDD.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TrackingSheet : ControllerBase
    {
        private readonly IConfiguration _trackconfiguration;
        private readonly IWebHostEnvironment _environment;
        public TrackingSheet(IConfiguration configuration, IWebHostEnvironment environment)
        {
            _trackconfiguration = configuration;
            _environment = environment;
        }


        [HttpGet("GetTrackingSheetData")]
        public IActionResult GetTrackingSheetData(int projectId, DateTime fromDate, DateTime toDate)
        {
            if (projectId == 0)
            {
                return BadRequest(new { message = "Project ID is required." });
            }

            try
            {
                Tracking db = new Tracking(_trackconfiguration);

                DataSet ds = db.getProjectHeadersDataSet(projectId, fromDate, toDate);

                var columnsList = new List<Dictionary<string, object>>();
                var dataList = new List<Dictionary<string, object>>();

                if (ds.Tables.Count > 0)
                {
                    foreach (DataRow row in ds.Tables[0].Rows)
                    {
                        var colDict = new Dictionary<string, object>();
                        foreach (DataColumn col in ds.Tables[0].Columns)
                        {
                            colDict[col.ColumnName] = row[col] == DBNull.Value ? null : row[col];
                        }
                        columnsList.Add(colDict);
                    }
                }

                if (ds.Tables.Count > 1)
                {
                    foreach (DataRow row in ds.Tables[1].Rows)
                    {
                        var rowDict = new Dictionary<string, object>();
                        foreach (DataColumn col in ds.Tables[1].Columns)
                        {
                            rowDict[col.ColumnName] = row[col] == DBNull.Value ? null : row[col];
                        }
                        dataList.Add(rowDict);
                    }
                }
                return Ok(new { columns = columnsList, data = dataList });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error loading data", error = ex.Message });
            }
        }

        [HttpGet("BindPackageDetails")]
        public async Task<IActionResult> BindPackageDetails([FromQuery] int projectId, [FromQuery] string orderNumber, [FromQuery] string pqaprocess)
        {
            if (projectId <= 0 || string.IsNullOrEmpty(orderNumber))
            {
                return BadRequest(new { message = "Invalid Project ID or Order Number." });
            }

            try
            {
                Tracking db = new Tracking(_trackconfiguration);

                DataTable dt = await Task.Run(() => db.GetPackageDetailsByProcess(projectId, orderNumber, pqaprocess));



                var dataList = new List<Dictionary<string, object>>();
                if (dt != null)
                {
                    foreach (DataRow row in dt.Rows)
                    {
                        var rowDict = new Dictionary<string, object>();
                        foreach (DataColumn col in dt.Columns)
                        {
                            rowDict[col.ColumnName] = row[col] == DBNull.Value ? null : row[col];
                        }
                        dataList.Add(rowDict);
                    }
                }

                return Ok(dataList);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching data", error = ex.Message });
            }
        }

        [HttpGet("DownloadFile")]
        public IActionResult DownloadFile([FromQuery] string relativePath)
        {
            try
            {
                if (string.IsNullOrEmpty(relativePath))
                {
                    return BadRequest("File path is required.");
                }
                string cleanPath = relativePath.Replace("/", Path.DirectorySeparatorChar.ToString())
                                               .Replace("\\", Path.DirectorySeparatorChar.ToString());

                string fullPath = Path.Combine(_environment.ContentRootPath, cleanPath);

                if (!System.IO.File.Exists(fullPath))
                {
                    return NotFound("file not found in Server.");
                }

                string contentType = "application/octet-stream";
                string fileName = Path.GetFileName(fullPath);

                var bytes = System.IO.File.ReadAllBytes(fullPath);
                return File(bytes, contentType, fileName);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost("UploadRowFile")]
        public async Task<IActionResult> UploadRowFile()
        {
            try
            {
                var uploadFile = Request.Form.Files["uploadFile"];

                string strProjectId = Request.Form["projectId"];
                string orderNoClean = Request.Form["orderNumber"];
                string processName = Request.Form["processName"];
                string EmployeeId = Request.Form["employeeId"];
                string OrderDate = Request.Form["OrderDate"];
                string folderDate = "";

                if (!string.IsNullOrEmpty(OrderDate))
                {

                    folderDate = DateTime.ParseExact(OrderDate.Trim(), "d-MMM-yyyy", System.Globalization.CultureInfo.InvariantCulture).ToString("yyyy-MM-dd");
                }

                if (string.IsNullOrEmpty(processName))
                {
                    processName = "DefaultFolder";
                }
                else
                {
                    foreach (char c in Path.GetInvalidFileNameChars())
                    {
                        processName = processName.Replace(c, '_');
                    }
                }
                if (uploadFile != null && uploadFile.Length > 0)
                {
                    string extension = Path.GetExtension(uploadFile.FileName);

                    string targetFolderPath = Path.Combine(
                        _environment.ContentRootPath,
                        "ProjectDocuments",
                        "Commitment",
                        folderDate,
                        orderNoClean,
                        processName
                    );

                    if (!Directory.Exists(targetFolderPath))
                    {
                        Directory.CreateDirectory(targetFolderPath);
                    }
                    string fileName = $"{orderNoClean}{extension}";
                    string filePath = Path.Combine(targetFolderPath, fileName);

                    using (var fileStream = new FileStream(filePath, FileMode.Create))
                    {
                        await uploadFile.CopyToAsync(fileStream);
                    }

                    string dbRelativePath = Path.Combine("ProjectDocuments", "Commitment", folderDate, orderNoClean, processName, fileName);

                    Hashtable htAttachmentParam = new Hashtable();
                    htAttachmentParam.Add("ProjectId", Convert.ToInt64(strProjectId));
                    htAttachmentParam.Add("FilePath", dbRelativePath);
                    htAttachmentParam.Add("AddedBy", Convert.ToInt64(EmployeeId));
                    htAttachmentParam.Add("OrderNo", Convert.ToString(orderNoClean.Trim()));
                    htAttachmentParam.Add("ProcessName", Convert.ToString(processName.Trim()));


                    Tracking db = new Tracking(_trackconfiguration);
                    int dbResult = db.InsertOrderCreationFiles(htAttachmentParam);

                    return Ok(new
                    {
                        Success = true,
                        Message = "File saved dynamically to folder and database entry successful!",
                        AttachmentStatus = dbResult
                    });
                }

                return BadRequest(new { Success = false, Message = "No file received." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Success = false, Message = "Server Error: " + ex.Message });
            }
        }

        [HttpPost("UpdateTrackingSheetValues")]
        public IActionResult UpdateTrackingSheetValues([FromBody] List<TrackingValueUpdateModel> payload)
        {
            if (payload == null || payload.Count == 0)
            {
                return BadRequest(new { success = false, message = "No data received for update." });
            }

            try
            {
                Tracking db = new Tracking(_trackconfiguration);
                int result = db.UpdateProjectTrackingCellValue(payload);

                if (result >= 0)
                {
                    return Ok(new { success = true, message = "Data updated successfully in InfinityERP!" });
                }
                else
                {
                    return StatusCode(500, new { success = false, message = "Database error occurred during update." });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
        public class TrackingValueUpdateModel
        {
            public int RowId { get; set; }
            public int projectId { get; set; }
            public int EmployeeId { get; set; }
            public int FieldConfigId { get; set; }
            public string FieldName { get; set; }
            public string DataType { get; set; }
            public string FieldValue { get; set; }
        }


        [HttpPost("SaveProcessFeedback")]
        public IActionResult SaveProcessFeedback([FromBody] ProcessFeedbackModel model)
        {
            if (model == null || string.IsNullOrEmpty(model.OrderNumber))
            {
                return BadRequest(new { success = false, message = "Invalid feedback data received." });
            }

            try
            {
                Tracking db = new Tracking(_trackconfiguration);
                int result = db.InsertProcessFeedback(model);


                if (result > 0)
                {
                    Hashtable htParam = new Hashtable();

                    htParam["Feedback"] = result;
                    htParam["ErrorType"] = model.errorType;
                    htParam["ErrorField"] = model.errorField;
                    htParam["FeedbackType"] = model.feedbackType;
                    htParam["FeedbackRecivedDate"] = model.feedbackReceivedDate?.ToString();
                    htParam["Remark"] = model.remark;
                    htParam["Shouldbe"] = model.shouldBe;
                    htParam["AddedBy"] = model.AddedBy;
                    htParam["Fatal"] = model.Criticality;
                    htParam["Error"] = model.errorField;

                    int secondResult = db.AddFeedbackForNewOrder(htParam);
                    return Ok(new { success = true, message = "Feedback saved successfully!" });
                }
                else
                {
                    return StatusCode(500, new { success = false, message = "Failed to save feedback in database." });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // Model for Feedback request
        public class ProcessFeedbackModel
        {
            public int ProjectId { get; set; }
            public string OrderNumber { get; set; }
            public string ProcessName { get; set; }
            public string PreviousProcessName { get; set; }
            public string Feedback { get; set; }
            public int EmpId { get; set; }
            public int RowIndex { get; set; }
            public string DealNo { get; set; }
            public string Criticality { get; set; }
            public int ProcessID { get; set; }
            public string OrderDate { get; set; }
            public string errorType { get; set; }
            public string errorField { get; set; }
            public string feedbackType { get; set; }
            public DateTime? feedbackReceivedDate { get; set; }   
            public string ErrorDoneBy { get; set; }
            public string FeedbackGivenBy { get; set; }
            public int AddedBy { get; set; }
            public string remark { get; set; }
            public string shouldBe { get; set; }
        
        }


        [HttpGet("GetUserCode")] 
        public IActionResult GetUserCode([FromQuery] int projectId)
        {
            try
            {
                Tracking db = new Tracking(_trackconfiguration);
                DataSet dss = db.getUserCode(projectId);
                var dataList = new List<Dictionary<string, object>>();
                if (dss != null && dss.Tables.Count > 0)
                {
                    DataTable firstTable = dss.Tables[0];
                    foreach (DataRow row in firstTable.Rows)
                    {
                        var rowDict = new Dictionary<string, object>();
                        foreach (DataColumn col in firstTable.Columns)
                        {
                            rowDict[col.ColumnName] = row[col] == DBNull.Value ? null : row[col];
                        }
                        dataList.Add(rowDict);
                    }
                }
                return Ok(dataList);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "error.", error = ex.Message });
            }
        }

        [HttpGet("GetProjectWiseOrdersDetails")]
        public IActionResult GetProjectWiseOrdersDetailsAPI([FromQuery] int empId, [FromQuery] string Code)
        {
            try
            {
                Tracking db = new Tracking(_trackconfiguration);

                var resultCount = db.GetProjectWiseOrdersDetails(empId, Code);

                return Ok(new { success = true, count = resultCount });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Error fetching details.", error = ex.Message });
            }
        }
    }
}
