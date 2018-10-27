using System;

struct EmailPass {
    public string email, pass;
    public EmailPass(string _email, string _pass) { this.email = _email; this.pass = _pass; }
};

public partial class _Default : System.Web.UI.Page {
    protected void Page_Load(object sender, EventArgs e) {
        string email = Request.Params["email"];
        string pass = Request.Params["pass"];
        EmailPass[] emailPass = new EmailPass [] {
            new EmailPass( "martha", "gutierrez"),
            new EmailPass( "utma", "ITPA4more"),
        };
        string redirect = "./login.html";
        foreach (var ep in emailPass) {
            if(ep.email == email && ep.pass == pass) { redirect = "./_index.html"; break; }
        }
        Response.Redirect(redirect);
    }
};
