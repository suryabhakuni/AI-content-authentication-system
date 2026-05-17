// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ContentVerification {

    struct VerificationRecord {
        bytes32 contentHash;
        bool isAuthentic;
        uint8 confidence;
        uint256 timestamp;
        address verifier;
        bool exists;
    }

    mapping(bytes32 => VerificationRecord) private records;
    mapping(address => bytes32[]) private userRecords;

    event RecordStored(
        bytes32 indexed contentHash,
        address indexed verifier,
        bool isAuthentic,
        uint8 confidence,
        uint256 timestamp
    );

    function storeRecord(
        bytes32 _contentHash,
        bool _isAuthentic,
        uint8 _confidence
    ) external {
        require(_contentHash != bytes32(0), "Content hash cannot be empty");
        require(_confidence <= 100, "Confidence must be between 0 and 100");
        require(!records[_contentHash].exists, "Record already exists for this content");

        records[_contentHash] = VerificationRecord({
            contentHash: _contentHash,
            isAuthentic: _isAuthentic,
            confidence: _confidence,
            timestamp: block.timestamp,
            verifier: msg.sender,
            exists: true
        });

        userRecords[msg.sender].push(_contentHash);

        emit RecordStored(
            _contentHash,
            msg.sender,
            _isAuthentic,
            _confidence,
            block.timestamp
        );
    }

    function getRecord(bytes32 _contentHash)
        external
        view
        returns (
            bytes32 contentHash,
            bool isAuthentic,
            uint8 confidence,
            uint256 timestamp,
            address verifier,
            bool exists
        )
    {
        VerificationRecord memory record = records[_contentHash];
        return (
            record.contentHash,
            record.isAuthentic,
            record.confidence,
            record.timestamp,
            record.verifier,
            record.exists
        );
    }

    function getUserRecords(address _userAddress)
        external
        view
        returns (bytes32[] memory)
    {
        return userRecords[_userAddress];
    }

    function getUserRecordCount(address _userAddress)
        external
        view
        returns (uint256)
    {
        return userRecords[_userAddress].length;
    }

    function recordExists(bytes32 _contentHash)
        external
        view
        returns (bool)
    {
        return records[_contentHash].exists;
    }
}
