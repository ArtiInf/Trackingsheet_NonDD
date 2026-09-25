using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Collections;
using System.Data;
using TrackingsheetNonDD.DBClass;

namespace TrackingsheetNonDD.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CreateNewOrder : ControllerBase
    {
        private readonly Tracking _tracking;
        private readonly IWebHostEnvironment _environment;
        public CreateNewOrder(Tracking tracking, IWebHostEnvironment environment)
        {
            _tracking = tracking;
            _environment = environment;
        }

        [HttpPost("CreateOrder")]
        public async Task<IActionResult> CreateOrder([FromForm] int strProejctId, [FromForm] string txtOrderNo, [FromForm] string dEFromDate, [FromForm] string username, [FromForm] string employeeId)
        {
            try
            {
              
                DateTime dt = Convert.ToDateTime(dEFromDate);
                string orderNoClean = txtOrderNo.Trim();
                string folderDate = dt.ToString("yyyy-MM-dd");

                Hashtable htParam1 = new Hashtable();
                htParam1.Add("ProjectID", Convert.ToInt32(strProejctId));
                htParam1.Add("Order#", Convert.ToString(txtOrderNo.Trim()));
                htParam1.Add("OrderDate", dt.ToString("dd-MMM-yyyy"));
                htParam1.Add("AddedBy", employeeId);
                int k = _tracking.InsertOrderCreateSingleOrder(htParam1);
                if (k == 0)
                {
                    return BadRequest("Unable to Created Order....!!!");
                }

                var uploadFile = Request.Form.Files["uploadFile"];

                if (uploadFile != null && uploadFile.Length > 0)
                {
                    string extension = Path.GetExtension(uploadFile.FileName);

                   
                    string targetFolderPath = Path.Combine(
                        _environment.ContentRootPath,
                        "ProjectDocuments",
                        "Commitment",
                        folderDate,     
                        orderNoClean,    
                        "Order Creation" 
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
                    string dbRelativePath = Path.Combine("ProjectDocuments", "Commitment", folderDate, orderNoClean, "Order Creation", fileName);

                    Hashtable htAttachmentParam = new Hashtable();
                    htAttachmentParam.Add("ProjectId", Convert.ToInt64(strProejctId));
                    htAttachmentParam.Add("FilePath", dbRelativePath);
                    htAttachmentParam.Add("AddedBy", Convert.ToInt64(employeeId));
                    htAttachmentParam.Add("OrderNo", Convert.ToString(txtOrderNo.Trim()));


                    int dbResult = _tracking.InsertOrderCreationFiles(htAttachmentParam);

                    return Ok(new
                    {
                        Success = true,
                        Message = "Order created, file saved to folder and database entry successful!",
                        AttachmentStatus = dbResult
                    });


                }

                return BadRequest("File not found in request.");

            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}

