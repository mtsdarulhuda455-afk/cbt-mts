import os
import zipfile

dist_git_dir = '/app/applet/dist/git'
zip_targets = [
    '/app/applet/cbt-hostinger-siap-upload.zip',
    '/app/applet/dist/cbt-hostinger-siap-upload.zip',
    '/app/applet/dist/git/cbt-hostinger-siap-upload.zip',
    '/app/applet/public/cbt-hostinger-siap-upload.zip',
]

if os.path.exists(dist_git_dir):
    print('[Hostinger Zip] Mengompresi paket dist/git menjadi cbt-hostinger-siap-upload.zip...')
    temp_zip = '/tmp/cbt-hostinger-siap-upload.zip'
    with zipfile.ZipFile(temp_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(dist_git_dir):
            for file in files:
                # Do not re-zip the zip file itself if present
                if file.endswith('.zip'):
                    continue
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, dist_git_dir)
                zf.write(full_path, arcname=rel_path)
    
    zip_size_kb = os.path.getsize(temp_zip) // 1024
    for target in zip_targets:
        os.makedirs(os.path.dirname(target), exist_ok=True)
        import shutil
        shutil.copyfile(temp_zip, target)
        print(f'✅ Berhasil membuat: {target} ({zip_size_kb} KB)')
else:
    print('dist/git folder not found, skipping zip creation.')
