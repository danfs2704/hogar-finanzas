#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::net::TcpStream;
use std::time::Duration;
use std::fs::OpenOptions;
use std::io::Write;
use tauri::Manager;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

struct ServerHandle(Mutex<Option<Child>>);

impl Drop for ServerHandle {
    fn drop(&mut self) {
        if let Ok(mut guard) = self.0.lock() {
            if let Some(ref mut child) = *guard {
                let _ = child.kill();
                let _ = child.wait();
            }
        }
    }
}

fn log_file() -> std::path::PathBuf {
    let app_data = dirs::data_dir().unwrap_or_default().join("HogarFinanzas");
    let _ = std::fs::create_dir_all(&app_data);
    app_data.join("server.log")
}

fn write_log(msg: &str) {
    if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(log_file()) {
        let _ = writeln!(f, "[{}] {}", chrono::Local::now().format("%H:%M:%S"), msg);
    }
}

fn wait_for_server(port: u16, max_seconds: u64) -> bool {
    for i in 0..max_seconds {
        if TcpStream::connect(format!("127.0.0.1:{}", port)).is_ok() {
            std::thread::sleep(Duration::from_secs(2));
            return true;
        }
        if i % 3 == 0 {
            write_log(&format!("Waiting for server on port {}... ({}s)", port, i));
        }
        std::thread::sleep(Duration::from_secs(1));
    }
    false
}

fn get_db_url() -> String {
    if let Some(data_dir) = dirs::data_dir() {
        let app_dir = data_dir.join("HogarFinanzas");
        let _ = std::fs::create_dir_all(&app_dir);
        return format!("file:{}", app_dir.join("data.db").display());
    }
    "file:./data.db".to_string()
}

fn get_node_log_path() -> String {
    if let Some(data_dir) = dirs::data_dir() {
        let app_dir = data_dir.join("HogarFinanzas");
        let _ = std::fs::create_dir_all(&app_dir);
        return app_dir.join("node.log").to_string_lossy().to_string();
    }
    "node.log".to_string()
}

fn main() {
    let port: u16 = 3456;
    let server_handle = ServerHandle(Mutex::new(None));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(server_handle)
        .setup(move |app| {
            write_log("=== Hogar Finanzas starting ===");

            let (node_exe, server_dir) = if cfg!(debug_assertions) {
                ("node".to_string(), std::env::current_dir().unwrap_or_default())
            } else {
                let res = app.path().resource_dir().expect("resource dir");
                let node = res.join("node-runtime").join("node.exe");
                let srv = res.join("server");
                (node.to_string_lossy().to_string(), srv)
            };

            let db_url = get_db_url();
            let node_log = get_node_log_path();
            write_log(&format!("Node: {}", node_exe));
            write_log(&format!("Server dir: {}", server_dir.display()));
            write_log(&format!("DB: {}", db_url));
            write_log(&format!("Node log: {}", node_log));

            let mut cmd = Command::new(&node_exe);
            cmd.arg("server.js")
                .env("PORT", port.to_string())
                .env("HOSTNAME", "127.0.0.1")
                .env("NODE_ENV", "production")
                .env("DATABASE_URL", &db_url)
                .env("NODE_LOG", &node_log)
                .current_dir(&server_dir)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());

            #[cfg(target_os = "windows")]
            {
                cmd.creation_flags(CREATE_NO_WINDOW);
            }

            match cmd.spawn() {
                Ok(child) => {
                    *app.state::<ServerHandle>().0.lock().unwrap() = Some(child);
                    write_log("Node.js server started (hidden window)");

                    let window = app.get_webview_window("main").unwrap().clone();
                    std::thread::spawn(move || {
                        write_log("Waiting for server...");
                        if wait_for_server(port, 30) {
                            write_log("Server ready!");
                            let url = format!("http://127.0.0.1:{}", port);
                            let _ = window.navigate(tauri::Url::parse(&url).unwrap());
                        } else {
                            write_log("ERROR: Server did not start in 30s");
                        }
                    });
                }
                Err(e) => {
                    write_log(&format!("FATAL: {}", e));
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
