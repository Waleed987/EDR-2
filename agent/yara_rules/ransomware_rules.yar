rule Ransomware_Encrypted_Extensions
{
    strings:
        $a1 = ".locked"
        $a2 = ".crypt"
        $a3 = ".enc"
    condition:
        any of them
}
