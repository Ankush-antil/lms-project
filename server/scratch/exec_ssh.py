import paramiko
import sys

def main():
    host = "143.110.183.139"
    user = "root"
    secret = "root"
    
    cmd = sys.argv[1] if len(sys.argv) > 1 else "ls -la /var/www; pm2 list; ls -la /var/www/lms /var/www/llms 2>/dev/null"
    
    print(f"Connecting to {host} as {user}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(hostname=host, username=user, password=secret, timeout=10)
        print("Connected! Running command:", cmd)
        stdin, stdout, stderr = ssh.exec_command(cmd)
        out = stdout.read().decode('utf-8', errors='ignore')
        err = stderr.read().decode('utf-8', errors='ignore')
        
        print("=== STDOUT ===")
        print(out)
        print("=== STDERR ===")
        print(err)
        
        ssh.close()
    except Exception as e:
        print("SSH Connection Failed:", e)

if __name__ == "__main__":
    main()
