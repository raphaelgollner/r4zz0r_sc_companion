use serde::Serialize;
use std::fs::{self, File};
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};

const KEYWORDS: [&str; 8] = [
  "SendCommodityBuyRequest",
  "SendCommoditySellRequest",
  "CommodityTransactionResponse",
  "SendShopBuyRequest",
  "RmShopFlowResponse",
  "Added notification \"Awarded",
  "AccountLoginCharacterStatus_Character",
  "Projected Start Location is",
];

const DEFAULT_DIRS: [&str; 4] = [
  "C:\\Program Files\\Roberts Space Industries\\StarCitizen\\LIVE",
  "D:\\Program Files\\Roberts Space Industries\\StarCitizen\\LIVE",
  "D:\\Roberts Space Industries\\StarCitizen\\LIVE",
  "E:\\Roberts Space Industries\\StarCitizen\\LIVE",
];

#[derive(Serialize)]
pub struct LogFile {
  name: String,
  first: Option<String>,
  last: Option<String>,
  lines: Vec<String>,
}

fn timestamp(line: &str) -> Option<String> {
  let rest = line.strip_prefix('<')?;
  let end = rest.find('>')?;
  let ts = &rest[..end];
  if ts.len() >= 20 && ts.starts_with("20") {
    Some(ts.to_string())
  } else {
    None
  }
}

fn read_log(path: &Path) -> Option<LogFile> {
  let mut reader = BufReader::new(File::open(path).ok()?);
  let mut buf = Vec::new();
  let mut first = None;
  let mut last = None;
  let mut lines = Vec::new();
  loop {
    buf.clear();
    match reader.read_until(b'\n', &mut buf) {
      Ok(0) | Err(_) => break,
      Ok(_) => {}
    }
    let line = String::from_utf8_lossy(&buf);
    let line = line.trim_end();
    if let Some(ts) = timestamp(line) {
      if first.is_none() {
        first = Some(ts.clone());
      }
      last = Some(ts);
    }
    if KEYWORDS.iter().any(|k| line.contains(k)) {
      lines.push(line.to_string());
    }
  }
  Some(LogFile {
    name: path.file_name()?.to_string_lossy().into_owned(),
    first,
    last,
    lines,
  })
}

fn is_plain_log(path: &Path) -> bool {
  let regular = fs::symlink_metadata(path).map(|m| m.file_type().is_file()).unwrap_or(false);
  regular && path.extension().map(|e| e.eq_ignore_ascii_case("log")).unwrap_or(false)
}

fn collect(dir: &str, skip: &[String]) -> Result<Vec<LogFile>, String> {
  if dir.starts_with("\\\\") || !Path::new(dir).is_absolute() {
    return Err("invalid_dir".into());
  }
  let base = PathBuf::from(dir);
  let mut paths: Vec<PathBuf> = Vec::new();
  let current = base.join("Game.log");
  if is_plain_log(&current) {
    paths.push(current);
  }
  if let Ok(entries) = fs::read_dir(base.join("logbackups")) {
    for entry in entries.flatten() {
      let p = entry.path();
      let known = p.file_name().map(|n| skip.iter().any(|s| s.as_str() == n.to_string_lossy())).unwrap_or(false);
      if is_plain_log(&p) && !known {
        paths.push(p);
      }
    }
  }
  if paths.is_empty() && skip.is_empty() {
    return Err("no_logs".into());
  }
  Ok(paths.iter().filter_map(|p| read_log(p)).collect())
}

#[tauri::command]
pub fn find_game_dir() -> Option<String> {
  DEFAULT_DIRS
    .iter()
    .find(|d| Path::new(d).join("Game.log").is_file())
    .map(|d| d.to_string())
}

#[tauri::command]
pub async fn read_game_logs(dir: String, skip: Option<Vec<String>>) -> Result<Vec<LogFile>, String> {
  let skip = skip.unwrap_or_default();
  tauri::async_runtime::spawn_blocking(move || collect(&dir, &skip))
    .await
    .map_err(|_| "read_failed".to_string())?
}
