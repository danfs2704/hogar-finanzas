#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::net::TcpStream;
use std::time::Duration;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
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

fn app_data_dir() -> PathBuf {
    dirs::data_dir().unwrap_or_default().join("HogarFinanzas")
}

fn log_file() -> PathBuf {
    let dir = app_data_dir();
    let _ = std::fs::create_dir_all(&dir);
    dir.join("server.log")
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
    let app_dir = app_data_dir();
    let _ = std::fs::create_dir_all(&app_dir);

    // Check config.json for custom DB path
    let config_path = app_dir.join("config.json");
    if let Ok(content) = std::fs::read_to_string(&config_path) {
        if let Ok(config) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(db_path) = config.get("dbPath").and_then(|v| v.as_str()) {
                let custom_dir = PathBuf::from(db_path);
                let _ = std::fs::create_dir_all(&custom_dir);
                return format!("file:{}", custom_dir.join("data.db").display());
            }
        }
    }

    // Default: AppData/HogarFinanzas/data.db
    format!("file:{}", app_dir.join("data.db").display())
}

fn get_node_log_path() -> String {
    let dir = app_data_dir();
    let _ = std::fs::create_dir_all(&dir);
    dir.join("node.log").to_string_lossy().to_string()
}

fn main() {
    let port: u16 = 3456;
    let server_handle = ServerHandle(Mutex::new(None));

    let db_url = get_db_url();
    let node_log = get_node_log_path();
    let app_data = app_data_dir();
    let _ = std::fs::create_dir_all(&app_data);
    let app_data_str = app_data.to_string_lossy().to_string();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
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

            write_log(&format!("Node: {}", node_exe));
            write_log(&format!("Server dir: {}", server_dir.display()));
            write_log(&format!("DB: {}", db_url));
            write_log(&format!("Node log: {}", node_log));
            write_log(&format!("App data: {}", app_data_str));

            let mut cmd = Command::new(&node_exe);
            cmd.arg("server.js")
                .env("PORT", port.to_string())
                .env("HOSTNAME", "127.0.0.1")
                .env("NODE_ENV", "production")
                .env("DATABASE_URL", &db_url)
                .env("NODE_LOG", &node_log)
                .env("APP_DATA_DIR", &app_data_str)
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
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                write_log("Window close requested — killing Node.js");
                let state = window.state::<ServerHandle>();
                if let Ok(mut guard) = state.0.lock() {
                    if let Some(ref mut child) = *guard {
                        let _ = child.kill();
                        let _ = child.wait();
                        write_log("Node.js process killed successfully");
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
