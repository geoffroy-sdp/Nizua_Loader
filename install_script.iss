[Setup]
AppName=Nizua Loader
AppVersion=1.0
DefaultDirName={localappdata}\NizuaLoader
DefaultGroupName=Nizua Loader
UninstallDisplayIcon={app}\assets\icon.ico
OutputDir=.
OutputBaseFilename=NizuaInstaller
Compression=lzma
SolidCompression=yes
SetupIconFile=assets\icon.ico
PrivilegesRequired=admin

[Languages]
Name: "french"; MessagesFile: "compiler:Languages\French.isl"

[Files]
Source: "*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{userdesktop}\Nizua Loader"; Filename: "{app}\run.bat"; WorkingDir: "{app}"; IconFilename: "{app}\assets\icon.ico"

[Run]
Filename: "{app}\install_dependencies.bat"; Flags: runhidden waituntilterminated
