using System;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Diagnostics;
using System.Drawing;
using System.Windows.Forms;
using System.Threading.Tasks;

namespace VideoStreamerLauncher
{
    static class Program
    {
        private static readonly string AppDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "Video-Streamer");
        private static readonly string ExePath = Path.Combine(AppDir, "Video Streamer.exe");
        private static readonly string FallbackExePath = Path.Combine(AppDir, "Video-Streamer-Portable.exe");
        private static readonly string DownloadUrl = "https://github.com/phwyverysad/local-video-streamer/releases/latest/download/Video-Streamer-win.zip";

        [STAThread]
        static void Main(string[] args)
        {
            // 1. If already installed, launch immediately with 0 delay and no UI
            if (File.Exists(ExePath))
            {
                try
                {
                    Process.Start(new ProcessStartInfo(ExePath) { WorkingDirectory = AppDir });
                    return;
                }
                catch { }
            }

            if (File.Exists(FallbackExePath))
            {
                try
                {
                    Process.Start(new ProcessStartInfo(FallbackExePath) { WorkingDirectory = AppDir });
                    return;
                }
                catch { }
            }

            // 2. Not installed yet: Show sleek auto-downloader window
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new InstallerForm());
        }

        private class InstallerForm : Form
        {
            private Label lblTitle;
            private Label lblStatus;
            private ProgressBar progressBar;
            private Label lblPercent;
            private Panel cardPanel;

            public InstallerForm()
            {
                this.Text = "Video Streamer";
                this.Size = new Size(460, 240);
                this.StartPosition = FormStartPosition.CenterScreen;
                this.FormBorderStyle = FormBorderStyle.FixedDialog;
                this.MaximizeBox = false;
                this.MinimizeBox = true;
                this.BackColor = Color.FromArgb(248, 250, 252);
                this.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);

                // Card panel
                cardPanel = new Panel
                {
                    Location = new Point(20, 20),
                    Size = new Size(405, 160),
                    BackColor = Color.White
                };
                cardPanel.Paint += (s, e) =>
                {
                    using (Pen p = new Pen(Color.FromArgb(226, 232, 240), 1))
                    {
                        e.Graphics.DrawRectangle(p, 0, 0, cardPanel.Width - 1, cardPanel.Height - 1);
                    }
                };

                lblTitle = new Label
                {
                    Text = "Video Streamer",
                    Font = new Font("Segoe UI", 13f, FontStyle.Bold),
                    ForeColor = Color.FromArgb(15, 23, 42),
                    Location = new Point(20, 18),
                    AutoSize = true
                };

                lblStatus = new Label
                {
                    Text = "กำลังเตรียมการดาวน์โหลดและติดตั้ง...",
                    Font = new Font("Segoe UI", 9f, FontStyle.Regular),
                    ForeColor = Color.FromArgb(100, 116, 139),
                    Location = new Point(20, 52),
                    Size = new Size(365, 20)
                };

                progressBar = new ProgressBar
                {
                    Location = new Point(20, 80),
                    Size = new Size(365, 12),
                    Style = ProgressBarStyle.Continuous,
                    Minimum = 0,
                    Maximum = 100
                };

                lblPercent = new Label
                {
                    Text = "0%",
                    Font = new Font("Segoe UI", 8.5f, FontStyle.Regular),
                    ForeColor = Color.FromArgb(148, 163, 184),
                    Location = new Point(20, 100),
                    Size = new Size(365, 20),
                    TextAlign = ContentAlignment.MiddleRight
                };

                cardPanel.Controls.Add(lblTitle);
                cardPanel.Controls.Add(lblStatus);
                cardPanel.Controls.Add(progressBar);
                cardPanel.Controls.Add(lblPercent);

                this.Controls.Add(cardPanel);

                this.Shown += async (s, e) => await StartInstallation();
            }

            private async Task StartInstallation()
            {
                string tempZip = Path.Combine(Path.GetTempPath(), "Video-Streamer-Setup.zip");

                try
                {
                    lblStatus.Text = "กำลังเชื่อมต่อเซิร์ฟเวอร์...";
                    ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12 | SecurityProtocolType.Tls11 | SecurityProtocolType.Tls;

                    using (WebClient client = new WebClient())
                    {
                        client.Headers.Add("User-Agent", "Video-Streamer-WebInstaller");

                        client.DownloadProgressChanged += (s, e) =>
                        {
                            this.Invoke((MethodInvoker)delegate
                            {
                                progressBar.Value = e.ProgressPercentage;
                                double mbReceived = e.BytesReceived / 1048576.0;
                                double mbTotal = e.TotalBytesToReceive / 1048576.0;
                                lblStatus.Text = string.Format("กำลังดาวน์โหลด... ({0:F1} MB / {1:F1} MB)", mbReceived, mbTotal);
                                lblPercent.Text = e.ProgressPercentage + "%";
                            });
                        };

                        await client.DownloadFileTaskAsync(new Uri(DownloadUrl), tempZip);
                    }

                    lblStatus.Text = "กำลังคลายไฟล์และติดตั้งโปรแกรม...";
                    progressBar.Style = ProgressBarStyle.Marquee;
                    lblPercent.Text = "โปรดรอสักครู่";

                    await Task.Run(() =>
                    {
                        if (Directory.Exists(AppDir))
                        {
                            try { Directory.Delete(AppDir, true); } catch { }
                        }
                        Directory.CreateDirectory(AppDir);

                        ZipFile.ExtractToDirectory(tempZip, AppDir);

                        // Create desktop shortcut
                        CreateShortcut();

                        try { File.Delete(tempZip); } catch { }
                    });

                    lblStatus.Text = "ติดตั้งสำเร็จ กำลังเปิดโปรแกรม...";

                    // Launch the application
                    string targetExe = File.Exists(ExePath) ? ExePath : FallbackExePath;
                    if (File.Exists(targetExe))
                    {
                        Process.Start(new ProcessStartInfo(targetExe) { WorkingDirectory = AppDir });
                    }

                    await Task.Delay(800);
                    this.Close();
                }
                catch (Exception ex)
                {
                    lblStatus.Text = "ไม่สามารถดาวน์โหลดได้อัตโนมัติ: " + ex.Message;
                    MessageBox.Show("เกิดข้อผิดพลาดในการดาวน์โหลด: " + ex.Message + "\n\nคุณสามารถดาวน์โหลดเวอร์ชัน Portable ได้โดยตรงจาก GitHub", "Video Streamer", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    this.Close();
                }
            }

            private void CreateShortcut()
            {
                try
                {
                    string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                    string shortcutPath = Path.Combine(desktopPath, "Video Streamer.lnk");
                    string targetExe = File.Exists(ExePath) ? ExePath : FallbackExePath;

                    Type t = Type.GetTypeFromCLSID(new Guid("72C24DD5-D70A-438B-84D2-9642D0457AB4")); // WScript.Shell
                    dynamic shell = Activator.CreateInstance(t);
                    dynamic shortcut = shell.CreateShortcut(shortcutPath);
                    shortcut.TargetPath = targetExe;
                    shortcut.WorkingDirectory = AppDir;
                    shortcut.Description = "Video Streamer - Local Video Streaming App";
                    shortcut.Save();
                }
                catch { }
            }
        }
    }
}
