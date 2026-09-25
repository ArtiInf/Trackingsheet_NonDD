using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Data;
using System.Data.SqlClient;
using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using TrackingsheetNonDD.DBClass;

namespace TrackingsheetNonDD.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class Login : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public Login(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        [HttpPost]
        public IActionResult UserLogin(string Username, string Password)
        {
            if (string.IsNullOrEmpty(Username) || string.IsNullOrEmpty(Password))
            {
                return BadRequest("Username and Password are required.");
            }

            //TimeZoneInfo localZone = TimeZoneInfo.Local;
            //if (localZone.Id.Contains("India") || localZone.Id == "IST" || localZone.Id.Contains("Calcutta"))
            //{
            //    return BadRequest("System access is restricted to United States time zones only.");
            //}
           
            Tracking login = new Tracking(_configuration);
            int ReturnValue = login.ValidateUser(Username, Password);
            if (ReturnValue == -1)
            {
                return NotFound("User does not exist.");
            }
            else if (ReturnValue == 0)
            {
                return Unauthorized("Invalid Password.");
            }
            else if (ReturnValue == -2)
            {
                return BadRequest("You forgot to do login on attendance system.");
            }
            else if (ReturnValue == -3)
            {
                return BadRequest("Time exceed, Logged in more than 16Hrs.");
            }

            int pmStatus = login.CheckPM(ReturnValue);
            bool isProjectManager = (pmStatus > 0);

            return Ok(new { message = "Login successful!", employeeId = ReturnValue, isProjectManager = isProjectManager });
        }
        [HttpGet("GetProject")] 
        public IActionResult GetProject(string EmployeeId)
        {
            if (string.IsNullOrEmpty(EmployeeId))
            {
                return BadRequest(new { message = "Employee ID " });
            }

            try
            {
                Tracking db = new Tracking(_configuration);

                DataTable dt = db.GetAllProjectByUserRights(EmployeeId);

                var projectList = new List<object>();


                if (dt != null && dt.Rows.Count > 0)
                {
                    foreach (DataRow row in dt.Rows)
                    {
                        projectList.Add(new
                        {
                            ProjectId = row["ProjectId"], 
                            ProjectName = row["ProjectName"] 
                        });
                    }
                }

                return Ok(projectList);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "error", error = ex.Message });
            }
        }

        [HttpGet("{userCode}")]
        public IActionResult GetUserByCode(string userCode)
        {
            DataTable dt = new DataTable();

            using (SqlConnection con = new SqlConnection(_configuration.GetConnectionString("InfinityERP")))
            {
                using (SqlCommand cmd = new SqlCommand("usp_getUserInformation_ByCode", con))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.AddWithValue("@Code", userCode);

                    using (SqlDataAdapter da = new SqlDataAdapter(cmd))
                    {
                        con.Open();
                        da.Fill(dt);
                    }
                }
            }
            var rows = new List<Dictionary<string, object>>();
            foreach (DataRow dr in dt.Rows)
            {
                var row = new Dictionary<string, object>();
                foreach (DataColumn col in dt.Columns)
                {
                    row[col.ColumnName] = dr[col];
                }
                rows.Add(row);
            }

            return Ok(rows);
        }

    }
}
