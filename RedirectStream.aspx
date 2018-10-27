<%@ Import Namespace = "System.Diagnostics" %>
<%@ Import Namespace = "System.Net" %>
<%@ Import Namespace = "System.IO" %>

 <%
     Dim sUrl As String

     sUrl = Request("URL")
     sUrl = sUrl.Trim()

     If Not sUrl.Length = 0 Then
         
         ' My.Computer.FileSystem.WriteAllText("C:\TFS\TF\JavaScript Map\code\URL.txt", sUrl, True)

         ' Create a 'WebRequest' object with the specified url 
         Dim myWebRequest As WebRequest = WebRequest.Create(sUrl)

         ' Send the 'WebRequest' and wait for response.
         Dim myWebResponse As WebResponse = myWebRequest.GetResponse()

         ' Call method 'GetResponseStream' to obtain stream associated with the response object
         Dim ReceiveStream As Stream = myWebResponse.GetResponseStream()

         Dim encode As Encoding = System.Text.Encoding.GetEncoding("utf-8")

         ' Pipe the stream to a higher level stream reader with the required encoding format.
         Dim readStream As New StreamReader(ReceiveStream, encode)
         Dim blockSize As Integer = 10240
         Dim read(blockSize) As [Char]

         ' Read 256 charcters at a time    .
         Dim count As Integer = readStream.Read(read, 0, blockSize)
         
         Response.ContentType = "application/xml"
         
         While count > 0

             ' Dump the 256 characters on a string and display the string onto the console.
             Dim str As New [String](read, 0, count)
             Response.Write(str)
             count = readStream.Read(read, 0, blockSize)

         End While
     
         ' Release the resources of stream object.
         readStream.Close()

         ' Release the resources of response object.
         myWebResponse.Close()
         
     End If
 %>

<script runat="server">
</script>