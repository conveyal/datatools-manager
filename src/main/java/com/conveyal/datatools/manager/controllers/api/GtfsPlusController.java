package com.conveyal.datatools.manager.controllers.api;

import com.conveyal.datatools.manager.DataManager;
import com.conveyal.datatools.manager.jobs.ProcessSingleFeedJob;
import com.conveyal.datatools.manager.models.FeedSource;
import com.conveyal.datatools.manager.models.FeedVersion;
import com.conveyal.datatools.manager.persistence.FeedStore;
import com.conveyal.datatools.manager.utils.json.JsonUtil;
import com.conveyal.gtfs.GTFSFeed;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import spark.Request;
import spark.Response;

import javax.servlet.MultipartConfigElement;
import javax.servlet.ServletException;
import javax.servlet.http.Part;
import java.io.*;
import java.util.*;
import java.util.concurrent.Exchanger;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import java.util.zip.ZipOutputStream;

import static spark.Spark.get;
import static spark.Spark.halt;
import static spark.Spark.post;

/**
 * Created by demory on 4/13/16.
 */
public class GtfsPlusController {

    public static final Logger LOG = LoggerFactory.getLogger(GtfsPlusController.class);

    private static FeedStore gtfsPlusStore = new FeedStore("gtfsplus");


    public static Boolean uploadGtfsPlusFile (Request req, Response res) throws IOException, ServletException {

        //FeedSource s = FeedSource.get(req.queryParams("feedSourceId"));
        String feedVersionId = req.params("versionid");

        if (req.raw().getAttribute("org.eclipse.jetty.multipartConfig") == null) {
            MultipartConfigElement multipartConfigElement = new MultipartConfigElement(System.getProperty("java.io.tmpdir"));
            req.raw().setAttribute("org.eclipse.jetty.multipartConfig", multipartConfigElement);
        }

        Part part = req.raw().getPart("file");

        LOG.info("Saving GTFS+ feed {} from upload for version " + feedVersionId);


        InputStream uploadStream;
        try {
            uploadStream = part.getInputStream();
            //v.newFeed(uploadStream);
            gtfsPlusStore.newFeed(feedVersionId, uploadStream, null);
        } catch (Exception e) {
            LOG.error("Unable to open input stream from upload");
            halt("Unable to read uploaded feed");
        }

        return true;
    }

    private static Object getGtfsPlusFile(Request req, Response res) {
        String feedVersionId = req.params("versionid");
        LOG.info("Downloading GTFS+ file for FeedVersion " + feedVersionId);

        // check for saved
        File file = gtfsPlusStore.getFeed(feedVersionId);
        if(file == null) {
            return getGtfsPlusFromGtfs(feedVersionId, res);
        }
        LOG.info("Returning updated GTFS+ data");
        return downloadGtfsPlusFile(file, res);
    }

    private static Object getGtfsPlusFromGtfs(String feedVersionId, Response res) {
        LOG.info("Extracting GTFS+ data from main GTFS feed");
        FeedVersion version = FeedVersion.get(feedVersionId);

        File gtfsPlusFile = null;

        // create a set of valid GTFS+ table names
        Set<String> gtfsPlusTables = new HashSet<>();
        for(int i = 0; i < DataManager.gtfsPlusConfig.size(); i++) {
            JsonNode tableNode = DataManager.gtfsPlusConfig.get(i);
            gtfsPlusTables.add(tableNode.get("name").asText());
        }

        try {

            // create a new zip file to only contain the GTFS+ tables
            gtfsPlusFile = File.createTempFile(version.id + "_gtfsplus", ".zip");
            ZipOutputStream zos = new ZipOutputStream(new FileOutputStream(gtfsPlusFile));

            // iterate through the existing GTFS file, copying any GTFS+ tables
            ZipFile gtfsFile = new ZipFile(version.getFeed());
            final Enumeration<? extends ZipEntry> entries = gtfsFile.entries();
            byte[] buffer = new byte[512];
            while (entries.hasMoreElements()) {
                final ZipEntry entry = entries.nextElement();
                if(!gtfsPlusTables.contains(entry.getName())) continue;

                // create a new empty ZipEntry and copy the contents
                ZipEntry newEntry = new ZipEntry(entry.getName());
                zos.putNextEntry(newEntry);
                InputStream in = gtfsFile.getInputStream(entry);
                while (0 < in.available()){
                    int read = in.read(buffer);
                    zos.write(buffer,0,read);
                }
                in.close();
                zos.closeEntry();
            }
            zos.close();

        } catch (Exception e) {
            halt(500, "Error getting GTFS+ file from GTFS");
        }

        return downloadGtfsPlusFile(gtfsPlusFile, res);
    }

    private static Object downloadGtfsPlusFile(File file, Response res) {
        res.raw().setContentType("application/octet-stream");
        res.raw().setHeader("Content-Disposition", "attachment; filename=" + file.getName() + ".zip");

        try {
            BufferedOutputStream bufferedOutputStream = new BufferedOutputStream(res.raw().getOutputStream());
            BufferedInputStream bufferedInputStream = new BufferedInputStream(new FileInputStream(file));

            byte[] buffer = new byte[1024];
            int len;
            while ((len = bufferedInputStream.read(buffer)) > 0) {
                bufferedOutputStream.write(buffer, 0, len);
            }

            bufferedOutputStream.flush();
            bufferedOutputStream.close();
        } catch (Exception e) {
            halt(500, "Error serving GTFS+ file");
        }

        return res.raw();
    }

    private static Long getGtfsPlusFileTimestamp(Request req, Response res) {
        String feedVersionId = req.params("versionid");

        // check for saved GTFS+ data
        File file = gtfsPlusStore.getFeed(feedVersionId);
        if(file == null) {
            FeedVersion feedVersion = FeedVersion.get(feedVersionId);
            file = feedVersion.getFeed();
        }

        return file.lastModified();
    }

    private static Boolean publishGtfsPlusFile(Request req, Response res) {
        String feedVersionId = req.params("versionid");
        LOG.info("Publishing GTFS+ for " + feedVersionId);
        File plusFile = gtfsPlusStore.getFeed(feedVersionId);
        if(plusFile == null || !plusFile.exists()) {
            halt(400, "No saved GTFS+ data for version");
        }

        FeedVersion feedVersion = FeedVersion.get(feedVersionId);

        // create a set of valid GTFS+ table names
        Set<String> gtfsPlusTables = new HashSet<>();
        for(int i = 0; i < DataManager.gtfsPlusConfig.size(); i++) {
            JsonNode tableNode = DataManager.gtfsPlusConfig.get(i);
            gtfsPlusTables.add(tableNode.get("name").asText());
        }

        File newFeed = null;

        try {

            // create a new zip file to only contain the GTFS+ tables
            newFeed = File.createTempFile(feedVersionId + "_new", ".zip");
            ZipOutputStream zos = new ZipOutputStream(new FileOutputStream(newFeed));

            // iterate through the existing GTFS file, copying all non-GTFS+ tables
            ZipFile gtfsFile = new ZipFile(feedVersion.getFeed());
            final Enumeration<? extends ZipEntry> entries = gtfsFile.entries();
            byte[] buffer = new byte[512];
            while (entries.hasMoreElements()) {
                final ZipEntry entry = entries.nextElement();
                if(gtfsPlusTables.contains(entry.getName()) || entry.getName().startsWith("_")) continue; // skip GTFS+ and non-standard tables

                // create a new empty ZipEntry and copy the contents
                ZipEntry newEntry = new ZipEntry(entry.getName());
                zos.putNextEntry(newEntry);
                InputStream in = gtfsFile.getInputStream(entry);
                while (0 < in.available()){
                    int read = in.read(buffer);
                    zos.write(buffer,0,read);
                }
                in.close();
                zos.closeEntry();
            }

            // iterate through the GTFS+ file, copying all entries
            ZipFile plusZipFile = new ZipFile(plusFile);
            final Enumeration<? extends ZipEntry> plusEntries = plusZipFile.entries();
            while (plusEntries.hasMoreElements()) {
                final ZipEntry entry = plusEntries.nextElement();

                ZipEntry newEntry = new ZipEntry(entry.getName());
                zos.putNextEntry(newEntry);
                InputStream in = plusZipFile.getInputStream(entry);
                while (0 < in.available()){
                    int read = in.read(buffer);
                    zos.write(buffer,0,read);
                }
                in.close();
                zos.closeEntry();
            }

            zos.close();

        } catch (Exception e) {
            e.printStackTrace();
            halt(500, "Error merging GTFS+ data with GTFS");
        }

        FeedVersion newFeedVersion = new FeedVersion(feedVersion.getFeedSource());

        try {
            newFeedVersion.newFeed(new FileInputStream(newFeed));
        } catch (Exception e) {
            e.printStackTrace();
            halt(500, "Error creating new FeedVersion from combined GTFS/GTFS+");
        }

        newFeedVersion.hash();

        // validation for the main GTFS content hasn't changed
        newFeedVersion.validationResult = feedVersion.validationResult;

        newFeedVersion.save();

        for(String resourceType : DataManager.feedResources.keySet()) {
            DataManager.feedResources.get(resourceType).feedVersionCreated(newFeedVersion, null);
        }

        return true;
    }

    private static Collection<ValidationIssue> getGtfsPlusValidation(Request req, Response res) {
        String feedVersionId = req.params("versionid");
        LOG.info("Validating GTFS+ for " + feedVersionId);
        FeedVersion feedVersion = FeedVersion.get(feedVersionId);

        List<ValidationIssue> issues = new LinkedList<>();


        // load the main GTFS
        GTFSFeed gtfsFeed = GTFSFeed.fromFile(feedVersion.getFeed().getAbsolutePath());

        // check for saved GTFS+ data
        File file = gtfsPlusStore.getFeed(feedVersionId);
        if(file == null) {
            file = feedVersion.getFeed();
        }

        try {
            ZipFile zipFile = new ZipFile(file);
            final Enumeration<? extends ZipEntry> entries = zipFile.entries();
            while (entries.hasMoreElements()) {
                final ZipEntry entry = entries.nextElement();
                for(int i = 0; i < DataManager.gtfsPlusConfig.size(); i++) {
                    JsonNode tableNode = DataManager.gtfsPlusConfig.get(i);
                    if(tableNode.get("name").asText().equals(entry.getName())) {
                        LOG.info("Validating GTFS+ table: " + entry.getName());
                        validateTable(issues, tableNode, zipFile.getInputStream(entry), gtfsFeed);
                    }
                }
            }

        } catch(Exception e) {
            e.printStackTrace();
            halt(500);
        }

        return issues;
    }

    private static void validateTable(Collection<ValidationIssue> issues, JsonNode tableNode, InputStream inputStream, GTFSFeed gtfsFeed) throws IOException {

        String tableId = tableNode.get("id").asText();
        BufferedReader in = new BufferedReader(new InputStreamReader(inputStream));
        String line = in.readLine();
        String[] fields = line.split(",");
        List<String> fieldList = Arrays.asList(fields);

        JsonNode[] fieldNodes = new JsonNode[fields.length];

        JsonNode fieldsNode = tableNode.get("fields");
        for(int i = 0; i < fieldsNode.size(); i++) {
            JsonNode fieldNode = fieldsNode.get(i);
            String fieldName = fieldNode.get("name").asText();
            int index = fieldList.indexOf(fieldName);
            if(index != -1) {
                fieldNodes[index] = fieldNode;
            }
            else {
                issues.add(new ValidationIssue(tableId, fieldName, -1, fieldName + " column not found in table data for table " + tableId));
            }
        }

        int rowIndex = 0;
        while((line = in.readLine()) != null) {
            String[] values = line.split(",", -1);
            for(int v=0; v < values.length; v++) {
                validateTableValue(issues, tableId, rowIndex, values[v], fieldNodes[v], gtfsFeed);
            }
            rowIndex++;
        }
    }

    private static void validateTableValue(Collection<ValidationIssue> issues, String tableId, int rowIndex, String value, JsonNode fieldNode, GTFSFeed gtfsFeed) {
        if(fieldNode == null) return;
        String fieldName = fieldNode.get("name").asText();

        if(fieldNode.get("required") != null && fieldNode.get("required").asBoolean()) {
            if(value == null || value.length() == 0) {
                issues.add(new ValidationIssue(tableId, fieldName, rowIndex, "Required field missing value"));
            }
        }

        switch(fieldNode.get("inputType").asText()) {
            case "TEXT":
                if(fieldNode.get("maxLength") != null) {
                    int maxLength = fieldNode.get("maxLength").asInt();
                    if(value.length() > maxLength) {
                        issues.add(new ValidationIssue(tableId, fieldName, rowIndex, "Text value exceeds the max. length of "+maxLength));
                    }
                }
                break;
            case "GTFS_ROUTE":
                if(!gtfsFeed.routes.containsKey(value)) {
                    issues.add(new ValidationIssue(tableId, fieldName, rowIndex, "Route ID "+ value + " not found in GTFS"));
                }
                break;
            case "GTFS_STOP":
                if(!gtfsFeed.stops.containsKey(value)) {
                    issues.add(new ValidationIssue(tableId, fieldName, rowIndex, "Stop ID "+ value + " not found in GTFS"));
                }
                break;
            case "GTFS_TRIP":
                if(!gtfsFeed.trips.containsKey(value)) {
                    issues.add(new ValidationIssue(tableId, fieldName, rowIndex, "Trip ID "+ value + " not found in GTFS"));
                }
                break;
            case "GTFS_FARE":
                if(!gtfsFeed.fares.containsKey(value)) {
                    issues.add(new ValidationIssue(tableId, fieldName, rowIndex, "Fare ID "+ value + " not found in GTFS"));
                }
                break;
            case "GTFS_SERVICE":
                if(!gtfsFeed.services.containsKey(value)) {
                    issues.add(new ValidationIssue(tableId, fieldName, rowIndex, "Service ID "+ value + " not found in GTFS"));
                }
                break;
        }

    }

    public static class ValidationIssue implements Serializable {
        public String tableId;
        public String fieldName;
        public int rowIndex;
        public String description;

        public ValidationIssue(String tableId, String fieldName, int rowIndex, String description) {
            this.tableId = tableId;
            this.fieldName = fieldName;
            this.rowIndex = rowIndex;
            this.description = description;
        }
    }

    public static void register(String apiPrefix) {
        post(apiPrefix + "secure/gtfsplus/:versionid", GtfsPlusController::uploadGtfsPlusFile, JsonUtil.objectMapper::writeValueAsString);
        get(apiPrefix + "secure/gtfsplus/:versionid", GtfsPlusController::getGtfsPlusFile);
        get(apiPrefix + "secure/gtfsplus/:versionid/timestamp", GtfsPlusController::getGtfsPlusFileTimestamp, JsonUtil.objectMapper::writeValueAsString);
        get(apiPrefix + "secure/gtfsplus/:versionid/validation", GtfsPlusController::getGtfsPlusValidation, JsonUtil.objectMapper::writeValueAsString);
        post(apiPrefix + "secure/gtfsplus/:versionid/publish", GtfsPlusController::publishGtfsPlusFile, JsonUtil.objectMapper::writeValueAsString);
    }
}
