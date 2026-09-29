using System;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Diagnostics;
using System.Drawing;
using System.Windows.Forms;
using System.Threading.Tasks;
using System.Text.RegularExpressions;

namespace VideoStreamerLauncher
{
    static class Program
    {
        private const string InstallerVersion = "1.0.2";
        private static readonly string AppDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "Video-Streamer");
        private static readonly string ExePath = Path.Combine(AppDir, "Video Streamer.exe");
        private static readonly string FallbackExePath = Path.Combine(AppDir, "Video-Streamer-Portable.exe");
        private static readonly string DownloadUrl = "https://github.com/phwyverysad/local-video-streamer/releases/latest/download/Video-Streamer-win.zip";

        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            bool hasInstalledExe = File.Exists(ExePath) || File.Exists(FallbackExePath);

            if (hasInstalledExe)
            {
                string installedVer = GetInstalledVersion();
                bool needsUpdate = IsNewerVersion(InstallerVersion, installedVer);

                // If installed version is already up to date, launch immediately with 0 delay and no UI
                if (!needsUpdate)
                {
                    try
                    {
                        string target = File.Exists(ExePath) ? ExePath : FallbackExePath;
                        Process.Start(new ProcessStartInfo(target) { WorkingDirectory = AppDir });
                        return;
                    }
                    catch { }
                }

                // If a newer version is available, show smooth auto-updater
                Application.Run(new InstallerForm(isUpdate: true, installedVer: installedVer));
                return;
            }

            // Fresh installation
            Application.Run(new InstallerForm(isUpdate: false, installedVer: null));
        }

        private static string GetInstalledVersion()
        {
            try
            {
                string verFile = Path.Combine(AppDir, "version.txt");
                if (File.Exists(verFile))
                {
                    string text = File.ReadAllText(verFile).Trim();
                    if (!string.IsNullOrEmpty(text)) return text;
                }

                string target = File.Exists(ExePath) ? ExePath : FallbackExePath;
                if (File.Exists(target))
                {
                    var info = FileVersionInfo.GetVersionInfo(target);
                    if (!string.IsNullOrEmpty(info.ProductVersion))
                    {
                        return info.ProductVersion.Trim();
                    }
                    if (!string.IsNullOrEmpty(info.FileVersion))
                    {
                        return info.FileVersion.Trim();
                    }
                }
            }
            catch { }
            return "0.0.0";
        }

        private static bool IsNewerVersion(string currentVer, string installedVer)
        {
            try
            {
                Version vCurrent = NormalizeVersion(currentVer);
                Version vInstalled = NormalizeVersion(installedVer);
                return vCurrent > vInstalled;
            }
            catch
            {
                return !string.Equals(currentVer, installedVer, StringComparison.OrdinalIgnoreCase);
            }
        }

        private static Version NormalizeVersion(string vStr)
        {
            if (string.IsNullOrEmpty(vStr)) return new Version(0, 0, 0);
            string clean = Regex.Replace(vStr, @"[^\d.]", "");
            string[] parts = clean.Split('.');
            int v0 = 0, v1 = 0, v2 = 0, v3 = 0;
            if (parts.Length > 0) int.TryParse(parts[0], out v0);
            if (parts.Length > 1) int.TryParse(parts[1], out v1);
            if (parts.Length > 2) int.TryParse(parts[2], out v2);
            if (parts.Length > 3) int.TryParse(parts[3], out v3);
            return new Version(v0, v1, v2, v3);
        }

        private class InstallerForm : Form
        {
            private readonly bool isUpdate;
            private readonly string installedVer;
            private Label lblTitle;
            private Label lblStatus;
            private ProgressBar progressBar;
            private Label lblPercent;
            private Panel cardPanel;

            public InstallerForm(bool isUpdate = false, string installedVer = null)
            {
                this.isUpdate = isUpdate;
                this.installedVer = installedVer;

                this.Text = isUpdate ? "Video Streamer - อัปเดตเวอร์ชันใหม่" : "Video Streamer";
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

                string titleText = isUpdate
                    ? string.Format("Video Streamer (v{0} -> v{1})", string.IsNullOrEmpty(installedVer) ? "1.0.0" : installedVer, InstallerVersion)
                    : string.Format("Video Streamer v{0}", InstallerVersion);

                lblTitle = new Label
                {
                    Text = titleText,
                    Font = new Font("Segoe UI", 12.5f, FontStyle.Bold),
                    ForeColor = Color.FromArgb(15, 23, 42),
                    Location = new Point(20, 18),
                    AutoSize = true
                };

                lblStatus = new Label
                {
                    Text = isUpdate ? "กำลังเตรียมการอัปเดตเวอร์ชันใหม่ (รักษาข้อมูลเดิม)..." : "กำลังเตรียมการดาวน์โหลดและติดตั้ง...",
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
                string tempZip = Path.Combine(Path.GetTempPath(), "Video-Streamer-Setup-" + Guid.NewGuid().ToString("N") + ".zip");
                string backupDir = Path.Combine(Path.GetTempPath(), "VS-Backup-" + Guid.NewGuid().ToString("N"));

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
                                if (mbTotal > 0)
                                {
                                    lblStatus.Text = string.Format("กำลังดาวน์โหลด... ({0:F1} MB / {1:F1} MB)", mbReceived, mbTotal);
                                }
                                else
                                {
                                    lblStatus.Text = string.Format("กำลังดาวน์โหลด... ({0:F1} MB)", mbReceived);
                                }
                                lblPercent.Text = e.ProgressPercentage + "%";
                            });
                        };

                        await client.DownloadFileTaskAsync(new Uri(DownloadUrl), tempZip);
                    }

                    lblStatus.Text = isUpdate ? "กำลังติดตั้งเวอร์ชันใหม่และคืนค่าข้อมูลเดิม..." : "กำลังคลายไฟล์และติดตั้งโปรแกรม...";
                    progressBar.Style = ProgressBarStyle.Marquee;
                    lblPercent.Text = "โปรดรอสักครู่";

                    await Task.Run(() =>
                    {
                        // 1. Terminate running application instances to prevent file lock
                        KillRunningApp();

                        // 2. Backup existing user data, shares, thumbnails, and uploads
                        if (Directory.Exists(AppDir))
                        {
                            BackupUserData(AppDir, backupDir);
                            try { Directory.Delete(AppDir, true); } catch { }
                        }

                        Directory.CreateDirectory(AppDir);

                        // 3. Extract new release binaries
                        ZipFile.ExtractToDirectory(tempZip, AppDir);

                        // 4. Restore user data so all links, shares, and settings are preserved
                        RestoreUserData(backupDir, AppDir);

                        // 5. Write version stamp
                        try
                        {
                            File.WriteAllText(Path.Combine(AppDir, "version.txt"), InstallerVersion);
                        }
                        catch { }

                        // 6. Create or update desktop shortcut
                        CreateShortcut();
                    });

                    lblStatus.Text = isUpdate ? "อัปเดตสำเร็จ กำลังเปิดโปรแกรม..." : "ติดตั้งสำเร็จ กำลังเปิดโปรแกรม...";

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
                    lblStatus.Text = "เกิดข้อผิดพลาด: " + ex.Message;
                    MessageBox.Show("ไม่สามารถดาวน์โหลดหรือติดตั้งได้อัตโนมัติ: " + ex.Message + "\n\nคุณสามารถเปิดใช้งานเวอร์ชัน Portable ได้โดยตรงจาก GitHub", "Video Streamer", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    this.Close();
                }
                finally
                {
                    // Cleanup temp files
                    try { if (File.Exists(tempZip)) File.Delete(tempZip); } catch { }
                    try { if (Directory.Exists(backupDir)) Directory.Delete(backupDir, true); } catch { }
                }
            }

            private static void KillRunningApp()
            {
                try
                {
                    foreach (var proc in Process.GetProcessesByName("Video Streamer"))
                    {
                        try
                        {
                            proc.Kill();
                            proc.WaitForExit(3000);
                        }
                        catch { }
                    }
                }
                catch { }
            }

            private static void BackupUserData(string sourceAppDir, string targetBackupDir)
            {
                try
                {
                    Directory.CreateDirectory(targetBackupDir);

                    // Backup data folder (shares.json, thumbnails/)
                    string dataSrc = Path.Combine(sourceAppDir, "data");
                    if (Directory.Exists(dataSrc))
                    {
                        CopyDirectory(dataSrc, Path.Combine(targetBackupDir, "data"));
                    }

                    // Backup uploads folder
                    string uploadsSrc = Path.Combine(sourceAppDir, "uploads");
                    if (Directory.Exists(uploadsSrc))
                    {
                        CopyDirectory(uploadsSrc, Path.Combine(targetBackupDir, "uploads"));
                    }

                    // Backup settings.json if present
                    string settingsSrc = Path.Combine(sourceAppDir, "settings.json");
                    if (File.Exists(settingsSrc))
                    {
                        File.Copy(settingsSrc, Path.Combine(targetBackupDir, "settings.json"), true);
                    }
                }
                catch { }
            }

            private static void RestoreUserData(string sourceBackupDir, string targetAppDir)
            {
                try
                {
                    if (!Directory.Exists(sourceBackupDir)) return;

                    string dataBackup = Path.Combine(sourceBackupDir, "data");
                    if (Directory.Exists(dataBackup))
                    {
                        string targetData = Path.Combine(targetAppDir, "data");
                        Directory.CreateDirectory(targetData);
                        CopyDirectory(dataBackup, targetData);
                    }

                    string uploadsBackup = Path.Combine(sourceBackupDir, "uploads");
                    if (Directory.Exists(uploadsBackup))
                    {
                        string targetUploads = Path.Combine(targetAppDir, "uploads");
                        Directory.CreateDirectory(targetUploads);
                        CopyDirectory(uploadsBackup, targetUploads);
                    }

                    string settingsBackup = Path.Combine(sourceBackupDir, "settings.json");
                    if (File.Exists(settingsBackup))
                    {
                        File.Copy(settingsBackup, Path.Combine(targetAppDir, "settings.json"), true);
                    }
                }
                catch { }
            }

            private static void CopyDirectory(string sourceDir, string targetDir)
            {
                Directory.CreateDirectory(targetDir);
                foreach (string file in Directory.GetFiles(sourceDir))
                {
                    string dest = Path.Combine(targetDir, Path.GetFileName(file));
                    File.Copy(file, dest, true);
                }
                foreach (string subDir in Directory.GetDirectories(sourceDir))
                {
                    string destSub = Path.Combine(targetDir, Path.GetFileName(subDir));
                    CopyDirectory(subDir, destSub);
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
