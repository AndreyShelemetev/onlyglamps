using Minio;
using Minio.DataModel.Args;

namespace OnlyGlamps.Api.Services;

public class StorageService
{
    private readonly IMinioClient _minio;
    private readonly string _bucket;

    public StorageService(IConfiguration config)
    {
        var endpoint = config["Storage:Endpoint"] ?? "storage:9000";
        var accessKey = config["Storage:AccessKey"] ?? "minioadmin";
        var secretKey = config["Storage:SecretKey"] ?? "minioadmin";
        _bucket = config["Storage:BucketName"] ?? "onlyglamps";

        _minio = new MinioClient()
            .WithEndpoint(endpoint)
            .WithCredentials(accessKey, secretKey)
            .Build();
    }

    public async Task EnsureBucketAsync()
    {
        var found = await _minio.BucketExistsAsync(new BucketExistsArgs().WithBucket(_bucket));
        if (!found)
        {
            await _minio.MakeBucketAsync(new MakeBucketArgs().WithBucket(_bucket));

            // Set bucket policy to allow public read
            var policy = $$"""
            {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {"AWS": ["*"]},
                        "Action": ["s3:GetObject"],
                        "Resource": ["arn:aws:s3:::{{_bucket}}/*"]
                    }
                ]
            }
            """;
            await _minio.SetPolicyAsync(new SetPolicyArgs().WithBucket(_bucket).WithPolicy(policy));
        }
    }

    public async Task<string> UploadFileAsync(Stream stream, string fileName, string contentType, string folder = "blog")
    {
        await EnsureBucketAsync();

        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        var objectName = $"{folder}/{Guid.NewGuid():N}{ext}";

        await _minio.PutObjectAsync(new PutObjectArgs()
            .WithBucket(_bucket)
            .WithObject(objectName)
            .WithStreamData(stream)
            .WithObjectSize(stream.Length)
            .WithContentType(contentType));

        return $"/storage/{_bucket}/{objectName}";
    }
}
